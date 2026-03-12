from dotenv import load_dotenv
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from db import engine
import exceptions


BUCKET_COUNT = 6

load_dotenv()


class RankedPlayer(BaseModel):
    uuid: str
    value: float


class HistogramData(BaseModel):
    metric_key: str
    unit: Optional[str]
    higher_is_better: bool
    player_value: float
    sample_size: int
    min_value: float
    max_value: float
    buckets: List[float]
    counts: List[float]
    percentile: float
    top_players: List[RankedPlayer]
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
        # ROUND-TRIP 1: Fetch metric details and player value (needed for early validation)
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
        order_direction = "DESC" if higher_is_better else "ASC"

        # ROUND-TRIP 2: Aggregates + histogram + top players in one CTE query
        result = await conn.execute(
            text(
                f"""
                WITH agg AS (
                    SELECT 
                        MIN(value) AS min_value,
                        MAX(value) AS max_value,
                        COUNT(*) AS sample_size,
                        100.0 * COUNT(*) FILTER (WHERE value <= :pv) / NULLIF(COUNT(*), 0) AS pct,
                        COUNT(*) FILTER (WHERE value > :pv) + 1 AS rank_desc,
                        COUNT(*) FILTER (WHERE value < :pv) + 1 AS rank_asc,
                        MIN(log10(value + 1)) AS log_mn,
                        MAX(log10(value + 1)) AS log_mx
                    FROM metric_values 
                    WHERE metric_id = :metric_id
                ),
                hist AS (
                    SELECT LEAST(
                        width_bucket(
                            log10(value + 1),
                            (SELECT log_mn FROM agg),
                            (SELECT log_mx FROM agg) + 1e-9,
                            :bucket_count
                        ), :bucket_count
                    ) AS bucket,
                    COUNT(*) AS c
                    FROM metric_values
                    WHERE metric_id = :metric_id
                      AND (SELECT log_mn FROM agg) IS NOT NULL
                    GROUP BY bucket
                ),
                series AS (
                    SELECT generate_series(1, :bucket_count) AS bucket
                ),
                buckets AS (
                    SELECT s.bucket, COALESCE(h.c, 0) AS count
                    FROM series s
                    LEFT JOIN hist h ON h.bucket = s.bucket
                    ORDER BY s.bucket
                ),
                top AS (
                    SELECT player_uuid, value
                    FROM metric_values
                    WHERE metric_id = :metric_id
                    ORDER BY value {order_direction}
                    LIMIT 5
                )
                SELECT
                    a.min_value, a.max_value, a.sample_size, a.pct,
                    a.rank_desc, a.rank_asc, a.log_mn, a.log_mx,
                    (SELECT json_agg(json_build_object('bucket', b.bucket, 'count', b.count) ORDER BY b.bucket) FROM buckets b) AS histogram,
                    (SELECT json_agg(json_build_object('uuid', t.player_uuid, 'value', t.value) ORDER BY t.value {order_direction}) FROM top t) AS top_players
                FROM agg a;
                """
            ),
            {
                "metric_id": metric_id,
                "pv": player_value,
                "bucket_count": BUCKET_COUNT,
            },
        )
        combined = result.fetchone()
        if combined is None:
            raise exceptions.ServiceError()

        min_value = float(combined.min_value) if combined.min_value is not None else 0.0
        max_value = float(combined.max_value) if combined.max_value is not None else 0.0
        sample_size = combined.sample_size or 0
        percentile = float(combined.pct) if combined.pct is not None else 0.0
        player_rank = (
            combined.rank_desc if higher_is_better else combined.rank_asc
        )
        log_mn = combined.log_mn
        log_mx = combined.log_mx

        # Calculate bucket edges locally in Python
        bucket_edges = []
        if log_mn is not None and log_mx is not None:
            bucket_edges = [
                float(10 ** (log_mn + (log_mx - log_mn) * (i / BUCKET_COUNT)) - 1)
                for i in range(BUCKET_COUNT + 1)
            ]

        # Parse histogram from JSON
        buckets = []
        if combined.histogram is not None:
            buckets = [float(item["count"]) for item in combined.histogram]

        # Parse top players from JSON
        top_players = []
        if combined.top_players is not None:
            top_players = [
                RankedPlayer(uuid=str(item["uuid"]).replace("-", ""), value=float(item["value"]))
                for item in combined.top_players
            ]

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
