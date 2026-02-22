from minecraft_api import GetMojangAPIData, MojangData
from sqlalchemy.orm import Session
import time
import httpx
from utils import normalize_uuid, is_valid_uuid
from redis.asyncio import Redis
import json

HARD_MINECRAFT_TTL = 60 * 60 * 24 * 7
MINECRAFT_TTL = 60 * 3
# we want to keep minecraft data fresh for normal searches, but
# hypixel guild lookups can quickly get rate-limited, so we consider
# data stale much later than normal searches

MINECRAFT_DATA_KEY = "aspexis:minecraft:data:"
MINECRAFT_USERNAME_KEY = "aspexis:minecraft:username:"


async def get_minecraft_cache(search_term: str, redis: Redis) -> MojangData | None:
    """Gets cache data for one search term with the default TTL"""

    if not is_valid_uuid(search_term):
        uuid = await redis.get(f"{MINECRAFT_USERNAME_KEY}{search_term.lower()}")
        if not uuid:
            return None
    else:
        uuid = search_term

    data = await redis.get(f"{MINECRAFT_DATA_KEY}{uuid}")

    if data is not None:
        data = json.loads(data)
        timestamp = data.get("timestamp", 0)
        if time.time() - timestamp < MINECRAFT_TTL:
            return MojangData(source="cache", **data["data"])

    return None


async def set_minecraft_cache(data: MojangData, redis: Redis):
    cache_dict = {"timestamp": time.time(), "data": data.model_dump(exclude={"source"})}
    await redis.set(
        f"{MINECRAFT_USERNAME_KEY}{data.username.lower()}", data.uuid, ex=MINECRAFT_TTL
    )
    await redis.set(
        f"{MINECRAFT_DATA_KEY}{data.uuid}",
        json.dumps(cache_dict),
        ex=HARD_MINECRAFT_TTL,
    )


async def bulk_get_usernames_cache(
    uuids: list[str],
    redis: Redis,
) -> tuple[list[dict[str, str]], list[str]]:
    """
    Bulk fetch Minecraft identity data from Redis.
    Used for guild lookups (ignores soft TTL).
    """

    if not uuids:
        return [], []

    # Normalize UUIDs
    normalized_uuids = [normalize_uuid(u) for u in uuids]

    keys = [f"{MINECRAFT_DATA_KEY}{uuid}" for uuid in normalized_uuids]

    results = await redis.mget(keys)

    resolved_results: list[dict[str, str]] = []
    unresolved_uuids: list[str] = []

    for uuid, raw in zip(normalized_uuids, results):
        if not raw:
            unresolved_uuids.append(uuid)
            continue

        try:
            parsed = json.loads(raw)
            payload = parsed.get("data")
            if not payload:
                unresolved_uuids.append(uuid)
                continue

            resolved_results.append(
                {
                    "uuid": uuid,
                    "username": payload.get("username"),
                    "skin_showcase_b64": payload.get("skin_showcase_b64"),
                }
            )

        except Exception:
            unresolved_uuids.append(uuid)

    return resolved_results, unresolved_uuids


async def get_minecraft_data(
    search_term: str, session: Session, http_client: httpx.AsyncClient, redis: Redis
) -> MojangData:

    data = await get_minecraft_cache(search_term, redis)

    if data is None:
        if len(search_term) <= 20:
            mojang_instance = GetMojangAPIData(http_client, search_term)
        else:
            search_term = normalize_uuid(search_term)
            mojang_instance = GetMojangAPIData(http_client, None, search_term)
        data = await mojang_instance.get_data()

    await set_minecraft_cache(data, redis)
    # await asyncio.to_thread(add_to_minecraft_cache, data.uuid, data, session)
    return data
