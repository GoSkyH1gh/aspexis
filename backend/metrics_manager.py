from dotenv import load_dotenv
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from db import engine
import exceptions


BUCKET_COUNT = 6

load_dotenv()


class HistogramData(BaseModel):
    metric_key: str
    unit: Optional[str]
    higher_is_better: bool
    player_value: float
    sample_size: int
    min_value: float
    max_value: float
    buckets: List[float]
    counts: List[int]
    percentile: float
    top_players: List[dict]
    player_rank: int


async def add_value(conn, uuid, id, value) -> None:
    await conn.execute(
        text(
            """
            INSERT INTO metric_values (player_uuid, metric_id, value)
            VALUES(:player_uuid, :metric_id, :value)
            ON CONFLICT (player_uuid, metric_id)
            DO UPDATE SET value = EXCLUDED.value
            """
        ),
        {"player_uuid": uuid, "metric_id": id, "value": value},
    )


async def create_stat() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO metrics (key, label, source, unit) VALUES(:key, :label, :source, :unit)"
            ),
            {
                "key": "wynncraft_raids_completed",
                "label": "Raids Completed",
                "source": "wynncraft",
                "unit": None,
            },
        )


async def get_stats(metric_key, player_uuid) -> HistogramData:
    async with engine.begin() as conn:
        # QUERY 1: Fetch metric details and player value
        result = await conn.execute(
            text(
                """
                SELECT m.id, m.unit, m.higher_is_better, v.value AS player_value
                FROM metrics m
                LEFT JOIN metric_values v ON m.id = v.metric_id AND v.player_uuid = :player_uuid
                WHERE m.key = :metric_key;
                """
            ),
            {"metric_key": metric_key, "player_uuid": player_uuid},
        )
        row = result.fetchone()
        
        if not row:
            raise exceptions.NotFound()
        if row.player_value is None:
            raise exceptions.NotFound()
            
        metric_id = row.id
        unit = row.unit
        higher_is_better = row.higher_is_better
        player_value = float(row.player_value)

        # QUERY 2: Fetch all aggregates efficiently
        result = await conn.execute(
            text(
                """
                SELECT 
                    MIN(value) AS min_value,
                    MAX(value) AS max_value,
                    COUNT(*) AS sample_size,
                    100.0 * COUNT(*) FILTER (WHERE value <= :pv) / NULLIF(COUNT(*), 0) AS pct,
                    COUNT(*) FILTER (WHERE value > :pv) + 1 AS custom_rank_desc,
                    COUNT(*) FILTER (WHERE value < :pv) + 1 AS custom_rank_asc,
                    MIN(log10(value + 1)) AS log_mn,
                    MAX(log10(value + 1)) AS log_mx
                FROM metric_values 
                WHERE metric_id = :metric_id
                """
            ),
            {"metric_id": metric_id, "pv": player_value},
        )
        bounds = result.fetchone()
        min_value = float(bounds.min_value) if bounds.min_value is not None else 0.0
        max_value = float(bounds.max_value) if bounds.max_value is not None else 0.0
        sample_size = bounds.sample_size or 0
        percentile = float(bounds.pct) if bounds.pct is not None else 0.0
        player_rank = bounds.custom_rank_desc if higher_is_better else bounds.custom_rank_asc
        log_mn = bounds.log_mn
        log_mx = bounds.log_mx

        # Calculate bucket edges locally in Python
        bucket_edges = []
        if log_mn is not None and log_mx is not None:
            bucket_edges = [
                float(10 ** (log_mn + (log_mx - log_mn) * (i / BUCKET_COUNT)) - 1)
                for i in range(BUCKET_COUNT + 1)
            ]

        # QUERY 3: Calculate the histogram based on bounds
        buckets = []
        if log_mn is not None and log_mx is not None:
            result = await conn.execute(
                text(
                    """
                    WITH hist AS (
                        SELECT LEAST(width_bucket(log10(value + 1), :log_mn, :log_mx + 1e-9, :bucket_count), :bucket_count) AS bucket,
                               COUNT(*) AS c
                        FROM metric_values
                        WHERE metric_id = :metric_id
                        GROUP BY bucket
                    ),
                    series AS (
                        SELECT generate_series(1, :bucket_count) AS bucket
                    )
                    SELECT s.bucket, COALESCE(h.c, 0) AS count
                    FROM series s
                    LEFT JOIN hist h ON h.bucket = s.bucket
                    ORDER BY s.bucket;
                    """
                ),
                {"bucket_count": BUCKET_COUNT, "metric_id": metric_id, "log_mn": log_mn, "log_mx": log_mx},
            )
            buckets_row = result.fetchall()
            buckets = [float(item[1]) for item in buckets_row]

        # QUERY 4: Fetch top players
        order_direction = "DESC" if higher_is_better else "ASC"
        result = await conn.execute(
            text(
                f"""
                SELECT player_uuid, value 
                FROM metric_values 
                WHERE metric_id = :metric_id 
                ORDER BY value {order_direction} 
                LIMIT 5
                """
            ),
            {"metric_id": metric_id},
        )
        top_players_rows = result.fetchall()
        top_players = [{"uuid": top_row.player_uuid, "value": float(top_row.value)} for top_row in top_players_rows]

        histogram_data = HistogramData(
            metric_key=metric_key,
            unit=unit,
            higher_is_better=higher_is_better,
            sample_size=sample_size,
            min_value=min_value,
            max_value=max_value,
            buckets=bucket_edges,
            counts=buckets,
            percentile=percentile,
            player_value=player_value,
            top_players=top_players,
            player_rank=player_rank,
        )
        return histogram_data


if __name__ == "__main__":
    import asyncio
    asyncio.run(get_stats("wynncraft_hours_played", "1ed075fc5aa942e0a29f640326c1d80c"))
    # asyncio.run(add_value("3ff2e63ad63045e0b96f57cd0eae708d", 7, 52))
