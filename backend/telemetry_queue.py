"""
telemetry_queue.py

Fire-and-forget telemetry events are pushed into an in-memory asyncio.Queue
instead of spawning a DB-bound coroutine per request.

A single long-running background worker drains the queue and flushes to the
database in batches, so the connection pool is never starved by concurrent
telemetry writes.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text

from db import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Max rows to buffer before forcing a flush even when the timer hasn't fired.
BATCH_SIZE = 50

# Seconds to wait before flushing a partial batch.
FLUSH_INTERVAL = 5.0


@dataclass
class TelemetryEvent:
    path: str
    provider: str
    latency_ms: int
    status_code: Optional[int] = None
    cache_hit: Optional[bool] = None
    properties: Optional[dict] = None
    request_id: Optional[str] = None
    user_agent: Optional[str] = None


# Module-level queue — populated by the middleware, drained by the worker.
_queue: asyncio.Queue[TelemetryEvent] = asyncio.Queue()


def enqueue(event: TelemetryEvent) -> None:
    """Non-blocking push from the telemetry middleware. Never touches the DB."""
    try:
        _queue.put_nowait(event)
    except asyncio.QueueFull:
        # Shouldn't happen with an unbounded queue, but guard anyway.
        logger.warning("Telemetry queue full — event dropped.")


async def _flush_batch(batch: list[TelemetryEvent]) -> None:
    """Insert a batch of telemetry events in a single DB round-trip."""
    if not batch:
        return
    rows = [
        {
            "path": e.path,
            "provider": e.provider,
            "status_code": e.status_code,
            "latency_ms": e.latency_ms,
            "cache_hit": e.cache_hit,
            "properties": e.properties,
            "request_id": e.request_id,
            "user_agent": e.user_agent,
        }
        for e in batch
    ]
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO telemetry_events
                    (path, provider, status_code, latency_ms, cache_hit, properties, request_id, user_agent)
                SELECT
                    e->>'path',
                    e->>'provider',
                    (e->>'status_code')::int,
                    (e->>'latency_ms')::int,
                    (e->>'cache_hit')::boolean,
                    (e->'properties'),
                    e->>'request_id',
                    e->>'user_agent'
                FROM jsonb_array_elements(CAST(:rows AS jsonb)) AS e
                """
            ),
            {"rows": __import__("json").dumps(rows)},
        )
        await session.commit()


async def run_worker() -> None:
    """
    Long-running background task started at app startup.

    Collects events from the queue and flushes them to the DB either when
    BATCH_SIZE is reached or FLUSH_INTERVAL seconds have passed, whichever
    comes first.
    """
    logger.info("Telemetry batch worker started.")
    batch: list[TelemetryEvent] = []

    while True:
        deadline = asyncio.get_event_loop().time() + FLUSH_INTERVAL

        # Collect events until we hit the batch cap or the flush interval.
        while len(batch) < BATCH_SIZE:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                break
            try:
                event = await asyncio.wait_for(_queue.get(), timeout=remaining)
                batch.append(event)
            except asyncio.TimeoutError:
                break  # Flush interval elapsed — flush whatever we have.

        if batch:
            try:
                await _flush_batch(batch)
            except Exception:
                logger.exception(
                    "Telemetry batch flush failed — %d events lost.", len(batch)
                )
            finally:
                batch.clear()
