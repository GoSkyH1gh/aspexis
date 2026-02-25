from minecraft_api import GetMojangAPIData, MojangData
import time
import httpx
from utils import normalize_uuid, is_valid_uuid
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json

HARD_MINECRAFT_TTL = 60 * 60 * 24 * 7
MINECRAFT_TTL = 60 * 3
# we want to keep minecraft data fresh for normal searches, but
# hypixel guild lookups can quickly get rate-limited, so we consider
# data stale much later than normal searches

MINECRAFT_DATA_KEY = "aspexis:minecraft:data:"
MINECRAFT_USERNAME_KEY = "aspexis:minecraft:username:"


async def get_minecraft_cache(
    search_term: str, redis: Redis, allow_stale: bool = False
) -> MojangData | None:
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
        if allow_stale or (time.time() - timestamp < MINECRAFT_TTL):
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
    search_term: str,
    http_client: httpx.AsyncClient,
    redis: Redis,
    allow_stale: bool = False,
) -> MojangData:

    data = await get_minecraft_cache(search_term, redis, allow_stale=allow_stale)

    if data is None:
        if len(search_term) <= 20:
            mojang_instance = GetMojangAPIData(http_client, search_term)
        else:
            search_term = normalize_uuid(search_term)
            mojang_instance = GetMojangAPIData(http_client, None, search_term)
        data = await mojang_instance.get_data()
        await set_minecraft_cache(data, redis)

    return data


async def update_player_history(data: MojangData, session: AsyncSession):
    """
    Background task to update the player's username, skin, and cape history.
    """
    # 1. Update Username History
    # We want to use Postgres UPSERT behavior or check if the latest matches.
    try:
        # Check the most recent username for this UUID
        result = await session.execute(
            text(
                """
                SELECT username, first_seen_at FROM player_username_history 
                WHERE uuid = :uuid 
                ORDER BY last_seen_at DESC LIMIT 1
                """
            ),
            {"uuid": data.uuid}
        )
        row = result.fetchone()
        
        if row and row.username.lower() == data.username.lower():
            # Update the last_seen_at and username casing for the most recent record
            await session.execute(
                text(
                    """
                    UPDATE player_username_history 
                    SET last_seen_at = CURRENT_TIMESTAMP,
                        username = :new_username
                    WHERE uuid = :uuid 
                      AND first_seen_at = :first_seen_at
                    """
                ),
                {
                    "uuid": data.uuid, 
                    "new_username": data.username, 
                    "first_seen_at": row.first_seen_at
                }
            )
        else:
            # Different username or no record at all -> Insert a new row
            await session.execute(
                text(
                    """
                    INSERT INTO player_username_history (uuid, username)
                    VALUES (:uuid, :username)
                    """
                ),
                {"uuid": data.uuid, "username": data.username}
            )
            
        # 2. Update Skin History
        if data.skin_url:
            # Extract hash after the base url
            skin_hash = data.skin_url.split("http://textures.minecraft.net/texture/")[-1]
            await session.execute(
                text(
                    """
                    INSERT INTO player_skin_history (uuid, skin_hash)
                    VALUES (:uuid, :skin_hash)
                    ON CONFLICT (uuid, skin_hash) DO NOTHING
                    """
                ),
                {"uuid": data.uuid, "skin_hash": skin_hash}
            )
            
        # 3. Update Cape History
        if data.cape_url:
            cape_hash = data.cape_url.split("http://textures.minecraft.net/texture/")[-1]
            await session.execute(
                text(
                    """
                    INSERT INTO player_cape_history (uuid, cape_hash)
                    VALUES (:uuid, :cape_hash)
                    ON CONFLICT (uuid, cape_hash) DO NOTHING
                    """
                ),
                {"uuid": data.uuid, "cape_hash": cape_hash}
            )
            
        await session.commit()
    except Exception as e:
        await session.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to update player history for {data.uuid}: {e}")
