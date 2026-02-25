from hypixel_api import (
    HypixelPlayer,
    HypixelGuild,
    HypixelFullData,
    HypixelGuildMember,
    HypixelGuildMemberFull,
    get_core_hypixel_data,
    get_guild_data,
)
from utils import check_valid_uuid
import exceptions
from sqlalchemy.ext.asyncio import AsyncSession
from db import engine
from typing import Tuple, Optional, List
from minecraft_manager import (
    bulk_get_usernames_cache,
    get_minecraft_data,
    update_player_history,
)
from fastapi import BackgroundTasks
import asyncio
import httpx
from redis.asyncio import Redis
from pydantic import BaseModel, Field
from metrics_manager import add_value
import json

# in seconds
HYPIXEL_TTL = 60 * 3


HYPIXEL_PLAYER_KEY = "aspexis:hypixel:player:"
HYPIXEL_GUILD_KEY = "aspexis:hypixel:guild:"
HYPIXEL_PLAYER_GUILD_KEY = "aspexis:hypixel:player_guild:"


async def get_hypixel_player_cache(
    uuid: str, redis: Redis
) -> Tuple[HypixelPlayer, Optional[str]] | None:
    data = await redis.get(f"{HYPIXEL_PLAYER_KEY}{uuid}")
    if data is not None:
        try:
            parsed_data = json.loads(data)
            player_data = HypixelPlayer(source="cache", **parsed_data.get("data", {}))
            guild_id = parsed_data.get("guild_id")
            return player_data, guild_id
        except Exception:
            return None
    return None


async def get_hypixel_data(
    uuid: str, http_client: httpx.AsyncClient, redis: Redis
) -> HypixelFullData:
    if not check_valid_uuid(uuid):
        raise exceptions.InvalidUserUUID()

    player_data = None
    guild_data = None
    guild_id = None
    hypixel_cache_valid = False

    player_cache = await get_hypixel_player_cache(uuid, redis)
    if player_cache is not None:
        player_data, guild_id = player_cache
        hypixel_cache_valid = True

    if guild_id is None:
        cached_guild_id = await redis.get(f"{HYPIXEL_PLAYER_GUILD_KEY}{uuid}")
        if cached_guild_id:
            guild_id = (
                cached_guild_id.decode("utf-8")
                if isinstance(cached_guild_id, bytes)
                else str(cached_guild_id)
            )

    if player_data is None:
        player_data = await get_core_hypixel_data(uuid, http_client)

    if guild_id is not None:
        guild_data = await get_hypixel_guild_cache(guild_id, redis)

    if guild_data is None:
        if hypixel_cache_valid and guild_id is None:
            # Player is definitively known to be guildless from valid cache
            pass
        else:
            # Cache expired OR we know they might have a guild, need to fetch from API
            try:
                guild_data = await get_guild_data(http_client, uuid)
            except exceptions.NotFound:
                guild_data = None

    hypixel_data = HypixelFullData(player=player_data, guild=guild_data)

    # caching
    if hypixel_data.player.source == "hypixel_api":
        await set_hypixel_player_cache(
            uuid,
            hypixel_data.player,
            hypixel_data.guild.id if hypixel_data.guild is not None else None,
            redis,
        )

    if (
        hypixel_data.guild is not None
        and hypixel_data.guild.id
        and hypixel_data.guild.source == "hypixel_api"
    ):
        await set_hypixel_guild_cache(hypixel_data.guild.id, hypixel_data.guild, redis)

    return hypixel_data


async def set_hypixel_player_cache(
    uuid: str, data: HypixelPlayer, guild_id: Optional[str], redis: Redis
) -> None:
    cache_dict = {"data": data.model_dump(exclude={"source"}), "guild_id": guild_id}
    if guild_id is not None:
        pipe = redis.pipeline()
        pipe.set(f"{HYPIXEL_PLAYER_KEY}{uuid}", json.dumps(cache_dict), ex=HYPIXEL_TTL)
        pipe.set(f"{HYPIXEL_PLAYER_GUILD_KEY}{uuid}", guild_id, ex=HYPIXEL_TTL)
        await pipe.execute()
    else:
        await redis.set(
            f"{HYPIXEL_PLAYER_KEY}{uuid}", json.dumps(cache_dict), ex=HYPIXEL_TTL
        )


async def get_hypixel_guild_cache(id: str, redis: Redis) -> HypixelGuild | None:
    data = await redis.get(f"{HYPIXEL_GUILD_KEY}{id}")
    if data is not None:
        try:
            parsed_data = json.loads(data)
            return HypixelGuild(source="cache", **parsed_data.get("data", {}))
        except Exception as e:
            print(f"Couldn't validate HypixelGuild from cache: {e}")
            return None

    print(f"no cache data found for guild {id}")
    return None


async def set_hypixel_guild_cache(id: str, data: HypixelGuild, redis: Redis) -> None:
    cache_dict = {"data": data.model_dump(exclude={"source"})}
    pipe = redis.pipeline()
    pipe.set(f"{HYPIXEL_GUILD_KEY}{id}", json.dumps(cache_dict), ex=HYPIXEL_TTL)
    for member in data.members:
        pipe.set(f"{HYPIXEL_PLAYER_GUILD_KEY}{member.uuid}", id, ex=HYPIXEL_TTL)
    await pipe.execute()


# params for fastapi
class HypixelGuildMemberParams(BaseModel):
    limit: int = Field(20, gt=0, le=50)
    offset: int = Field(0, ge=0)


async def get_full_guild_members(
    id: str,
    session: AsyncSession,
    amount_to_load: int,
    http_client: httpx.AsyncClient,
    redis: Redis,
    offset: int = 0,
    background_tasks: BackgroundTasks | None = None,
) -> List[HypixelGuildMemberFull]:
    guild_data = await get_hypixel_guild_cache(id, redis)
    if guild_data is not None:
        print("source: cache")
    else:
        print("source: hypixel api")
        guild_data = await get_guild_data(http_client, id=id)
        if guild_data is not None:
            await set_hypixel_guild_cache(id, guild_data, redis)

    if guild_data is None:
        raise exceptions.ServiceError()

    resolved_uuids, unsolved_uuids = await bulk_get_usernames_cache(
        [member.uuid for member in guild_data.members], redis
    )
    print(f"found {len(resolved_uuids)} in cache, {len(unsolved_uuids)} left")

    print(
        f"fetching {len(guild_data.members[offset : offset + amount_to_load])} members out of {len(guild_data.members)}"
    )

    tasks = []
    for member in guild_data.members[offset : offset + amount_to_load]:
        tasks.append(
            get_member(
                member,
                unsolved_uuids,
                resolved_uuids,
                http_client,
                redis,
                session,
                background_tasks,
            )
        )

    results = await asyncio.gather(*tasks)
    return [res for res in results if isinstance(res, HypixelGuildMemberFull)]


async def get_member(
    member: HypixelGuildMember,
    unsolved_uuids: list,
    resolved_uuids: list,
    http_client: httpx.AsyncClient,
    redis: Redis,
    session: AsyncSession,
    background_tasks: BackgroundTasks | None = None,
):
    if member.uuid in unsolved_uuids:
        data = await get_minecraft_data(
            member.uuid, http_client, redis
        )  # this fetches live data
        if background_tasks and data.source != "cache":
            background_tasks.add_task(update_player_history, data, session)
        return HypixelGuildMemberFull(
            username=data.username,
            uuid=data.uuid,
            skin_showcase_b64=data.skin_showcase_b64,
            rank=member.rank,
            joined=member.joined,
        )
    else:
        for resolved_member in resolved_uuids:
            if resolved_member.get("uuid") == member.uuid:
                return HypixelGuildMemberFull(
                    rank=member.rank, joined=member.joined, **resolved_member
                )


async def add_hypixel_stats_to_db(hypixel_data: HypixelFullData):
    if not isinstance(hypixel_data, HypixelFullData):
        print("Invalid data type passed to add_hypixel_stats_to_db")
        return

    stats_to_add = {
        21: hypixel_data.player.network_level,
        22: hypixel_data.player.karma,
        23: hypixel_data.player.achievement_points,
    }

    async with engine.begin() as conn:
        for stat in stats_to_add:
            if stats_to_add.get(stat, None) is not None:
                await add_value(
                    conn, hypixel_data.player.uuid, stat, stats_to_add[stat]
                )


if __name__ == "__main__":
    hypixel_data = get_hypixel_data(
        "3ff2e63ad63045e0b96f57cd0eae708d", httpx.AsyncClient(), Redis()
    )
    print(hypixel_data)
