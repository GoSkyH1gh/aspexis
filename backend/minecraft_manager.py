from minecraft_api import GetMojangAPIData, MojangData
from sqlalchemy.orm import Session
from sqlalchemy import text, bindparam
from typing import Tuple, List, Dict
import exceptions
import time
import httpx
import asyncio

MINECRAFT_TTL = 180


async def get_minecraft_data(
    search_term: str, session: Session, http_client: httpx.AsyncClient
) -> MojangData:
    data = None
    try:
        data = await asyncio.to_thread(get_minecraft_cache, search_term, session)
    except exceptions.InvalidCache:
        pass

    if data is None:
        if len(search_term) <= 20:
            mojang_instance = GetMojangAPIData(http_client, search_term)
        else:
            mojang_instance = GetMojangAPIData(http_client, None, search_term)
        data = await mojang_instance.get_data()

    await asyncio.to_thread(add_to_minecraft_cache, data.uuid, data, session)

    return data


def get_minecraft_cache(search_term: str, session: Session) -> MojangData:
    """Gets cache from either uuid or username"""
    if search_term is None:
        raise exceptions.InvalidCache()

    if len(search_term) <= 20:
        cache_data = session.execute(
            text(
                """
                SELECT data, extract(epoch from timestamp) as timestamp FROM minecraft_cache
                WHERE LOWER(data->>'username') = LOWER(:search_term)"""
            ),
            {"search_term": search_term},
        ).fetchone()
    else:
        cache_data = session.execute(
            text(
                """
                SELECT data, extract(epoch from timestamp) as timestamp FROM minecraft_cache
                WHERE uuid = :uuid"""
            ),
            {"uuid": search_term},
        ).fetchone()

    if cache_data is None:
        raise exceptions.InvalidCache()

    current_time = time.time()
    epoch_cache_time = int(cache_data.timestamp)
    if current_time - epoch_cache_time < MINECRAFT_TTL:
        try:
            return MojangData(source="cache", **cache_data.data)
        except Exception as e:
            print(f"Coudn't validate MojangData from cache: {e}")

    raise exceptions.InvalidCache()


def add_to_minecraft_cache(uuid: str, data: MojangData, session: Session):
    if data.source == "mojang_api":
        session.execute(
            text(
                """
                INSERT INTO minecraft_cache (uuid, data, timestamp) 
                VALUES (:uuid, :data, NOW())
                ON CONFLICT (uuid)
                DO UPDATE SET 
                    data = EXCLUDED.data,
                    timestamp = NOW()
                """
            ),
            {"uuid": uuid, "data": data.model_dump_json(exclude={"source"})},
        )
        session.commit()


def bulk_get_usernames_cache(
    uuids: list[str], session: Session
) -> Tuple[List[Dict[str, str]], List[str]]:
    cache_data = session.execute(
        text(
            "SELECT uuid, data->>'username' as username, data->>'skin_showcase_b64' as skin_showcase_b64 FROM minecraft_cache WHERE uuid IN :uuids;"
        ).bindparams(bindparam("uuids", expanding=True)),
        {"uuids": uuids},
    ).fetchall()
    resolved_results = []
    unsolved_uuids = uuids.copy()
    for row in cache_data:
        uuid = str(row.uuid).replace("-", "")
        resolved_results.append(
            {
                "uuid": uuid,
                "username": row.username,
                "skin_showcase_b64": row.skin_showcase_b64,
            }
        )
        unsolved_uuids.remove(uuid)
    return resolved_results, unsolved_uuids
