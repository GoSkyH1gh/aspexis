import os
from dotenv import load_dotenv
from redis.asyncio import Redis

load_dotenv()

ENV = os.getenv("ENV", "development")

redis = None


async def get_redis():
    global redis

    if redis is not None:
        return redis

    if ENV == "production":
        prod_url = os.getenv("REDIS_URL")

        if not prod_url:
            raise RuntimeError(
                "Production Redis url is not set in environment variables."
            )

        redis = Redis.from_url(
            url=prod_url,
        )
    else:
        redis = Redis(
            host="localhost",
            port=6379,
            decode_responses=True,
        )

    return redis
