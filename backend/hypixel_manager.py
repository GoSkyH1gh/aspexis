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
from sqlalchemy import text
from sqlalchemy.orm import Session
import time
from metrics_manager import get_engine
from typing import Tuple, Optional, List
from minecraft_manager import bulk_get_usernames_cache, get_minecraft_data
from concurrent.futures import ThreadPoolExecutor, as_completed
from db import SessionLocal
from pydantic import BaseModel, Field
from metrics_manager import add_value

# in seconds
HYPIXEL_TTL = 180


def get_hypixel_data(uuid, session: Session) -> HypixelFullData:
    if not check_valid_uuid(uuid):
        raise exceptions.InvalidUserUUID()

    player_data = None
    guild_data = None
    guild_id = None

    hypixel_cache_valid = check_hypixel_cache(uuid, session)
    if hypixel_cache_valid:
        try:
            player_data, guild_id = get_hypixel_cache(uuid, session)
        except RuntimeError:
            print("Failed getting data from hypixel cache, getting live result")

    if player_data is None:
        player_data = get_core_hypixel_data(uuid)

    if guild_id is not None:
        try:
            guild_data = get_hypixel_guild_cache(guild_id, session)
        except exceptions.InvalidCache:
            guild_data = None

    if (
        hypixel_cache_valid and guild_id == None
    ):  # handles if a cached player has no guild
        guild_data = None
    elif guild_data is None or guild_data == False:
        try:
            guild_data = get_guild_data(uuid)
        except exceptions.NotFound:
            guild_data = None

    hypixel_data = HypixelFullData(player=player_data, guild=guild_data)
    # caching
    if hypixel_data.player.source == "hypixel_api":
        if hypixel_data.guild is not None:
            add_to_hypixel_cache(
                uuid, hypixel_data.player, hypixel_data.guild.id, session
            )
        else:
            add_to_hypixel_cache(uuid, hypixel_data.player, None, session)
    if hypixel_data.guild is not None:
        if hypixel_data.guild.source == "hypixel_api" and hypixel_data.guild.id:
            add_to_hypixel_guild_cache(
                hypixel_data.guild.id, hypixel_data.guild, session
            )

    return hypixel_data


def check_hypixel_cache(uuid, session: Session) -> bool:
    current_time = time.time()
    cache_time = session.execute(
        text(
            "SELECT extract(epoch from timestamp) as timestamp FROM hypixel_cache WHERE uuid = :uuid;"
        ),
        {"uuid": uuid},
    ).fetchone()
    if cache_time is None:
        return False

    epoch_cache_time = int(cache_time.timestamp)
    if current_time - epoch_cache_time < HYPIXEL_TTL:
        return True
    else:
        return False


def get_hypixel_cache(uuid, session: Session) -> Tuple[HypixelPlayer, Optional[str]]:
    cache_data = session.execute(
        text("SELECT data, guild_id FROM hypixel_cache WHERE uuid = :uuid;"),
        {"uuid": uuid},
    ).fetchone()

    try:
        hypixel_player = HypixelPlayer(source="cache", **cache_data.data)
        guild_id: str = cache_data.guild_id
        return hypixel_player, guild_id
    except Exception:
        raise RuntimeError()


def get_hypixel_guild_cache(id, session: Session) -> HypixelGuild:
    cache_data = session.execute(
        text(
            "SELECT data, extract(epoch from timestamp) as timestamp FROM hypixel_guild_cache WHERE id = :id"
        ),
        {"id": id},
    ).fetchone()

    if cache_data.data is None:
        print(f"no cache data found for guild {id}")
        raise exceptions.InvalidCache()

    epoch_cache_time = int(cache_data.timestamp)
    current_time = time.time()
    if current_time - epoch_cache_time < HYPIXEL_TTL:
        try:
            return HypixelGuild(source="cache", **cache_data.data)
        except Exception as e:
            print(f"Coudn't validate HypixelGuild from cache: {e}")

    raise exceptions.InvalidCache()


def add_to_hypixel_cache(
    uuid: str, data: HypixelPlayer, guild_id: str, session: Session
) -> None:
    session.execute(
        text(
            """
            INSERT INTO hypixel_cache (uuid, data, timestamp, guild_id) 
            VALUES (:uuid, :data, NOW(), :guild_id)
            ON CONFLICT (uuid)
            DO UPDATE SET 
                data = EXCLUDED.data,
                timestamp = NOW(),
                guild_id = EXCLUDED.guild_id
            """
        ),
        {
            "uuid": uuid,
            "data": data.model_dump_json(exclude={"source"}),
            "guild_id": guild_id,
        },
    )
    session.commit()


def add_to_hypixel_guild_cache(id: str, data: HypixelGuild, session: Session) -> None:
    session.execute(
        text(
            """
            INSERT INTO hypixel_guild_cache (id, data, timestamp) 
            VALUES (:id, :data, NOW())
            ON CONFLICT (id)
            DO UPDATE SET 
                data = EXCLUDED.data,
                timestamp = NOW()
            """
        ),
        {"id": id, "data": data.model_dump_json(exclude={"source"})},
    )
    session.commit()


# params for fastapi
class HypixelGuildMemberParams(BaseModel):
    limit: int = Field(20, gt=0, le=50)
    offset: int = Field(0, ge=0)


async def get_full_guild_members(
    id: str, session: Session, amount_to_load: int, offset: int = 0
) -> List[HypixelGuildMemberFull]:
    guild_data = None
    try:
        guild_data = get_hypixel_guild_cache(
            id, session
        )  # TODO investigate why this isnt getting activated consistently
        print("source: cache")
    except exceptions.InvalidCache:
        print("source: hypixel api")
        guild_data = get_guild_data(id=id)
    if guild_data is None:
        raise exceptions.ServiceError()

    resolved_uuids, unsolved_uuids = await bulk_get_usernames_cache(
        [member.uuid for member in guild_data.members], session
    )
    print(f"found {len(resolved_uuids)} in cache, {len(unsolved_uuids)} left")

    print(
        f"fetching {len(guild_data.members[offset : offset + amount_to_load])} members out of {len(guild_data.members)}"
    )

    final_members = []

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for member in guild_data.members[offset : offset + amount_to_load]:
            futures.append(
                executor.submit(get_member, member, unsolved_uuids, resolved_uuids)
            )

        for future in as_completed(futures):
            data = future.result()
            if isinstance(data, HypixelGuildMemberFull):
                final_members.append(data)

    return final_members


def get_member(
    member: HypixelGuildMember,
    unsolved_uuids: list,
    resolved_uuids: list,
):
    if member.uuid in unsolved_uuids:
        with SessionLocal() as thread_session:
            data = get_minecraft_data(
                member.uuid, thread_session
            )  # this fetches live data
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


def add_hypixel_stats_to_db(hypixel_data: HypixelFullData):
    if not isinstance(hypixel_data, HypixelFullData):
        print("Invalid data type passed to add_hypixel_stats_to_db")
        return

    stats_to_add = {
        21: hypixel_data.player.network_level,
        22: hypixel_data.player.karma,
        23: hypixel_data.player.achievement_points,
    }

    engine = get_engine()
    with engine.begin() as conn:
        for stat in stats_to_add:
            if stats_to_add.get(stat, None) is not None:
                add_value(conn, hypixel_data.player.uuid, stat, stats_to_add[stat])


if __name__ == "__main__":
    db_engine = get_engine()
    hypixel_data = get_hypixel_data("3ff2e63ad63045e0b96f57cd0eae708d", db_engine)
    print(hypixel_data)
