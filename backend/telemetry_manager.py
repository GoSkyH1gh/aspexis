from sqlalchemy import text
from db import AsyncSessionLocal, engine

async def init_telemetry_manager() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
            CREATE TABLE IF NOT EXISTS telemetry_events (
            id BIGSERIAL PRIMARY KEY,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            path TEXT NULL,
            provider TEXT NULL,
            status_code INT NULL,
            latency_ms INT NULL,
            cache_hit BOOLEAN NULL,
            properties JSONB NULL DEFAULT '{}'
            );"""
            )
        )
    print("Telemetry manager initialized.")


async def add_telemetry_event(
    path: str,
    provider: str,
    latency_ms: int,
    status_code: int | None = None,
    cache_hit: bool | None = None,
    properties: dict | None = None,

) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO telemetry_events (path, provider, status_code, latency_ms, cache_hit, properties)
                VALUES (:path, :provider, :status_code, :latency_ms, :cache_hit, :properties);
                """
            ),
            {
                "path": path,
                "provider": provider,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "cache_hit": cache_hit,
                "properties": properties,
            },
        )
        await session.commit()

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_telemetry_manager())
