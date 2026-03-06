import httpx
from redis.asyncio import Redis
import asyncio
import os
import exceptions
from wynncraft_api import get_dungeon_unique_completions
from dotenv import load_dotenv
from pydantic import BaseModel
import json

load_dotenv()

wynn_token = os.getenv("WYNN_TOKEN")

if not wynn_token:
    raise RuntimeError("Wynncraft Token not set in environment variables.")

CONTENT_LEADERBOARD_URL = (
    "https://api.wynncraft.com/v3/leaderboards/playerContent?resultLimit=10"
)

BASE_PLAYER_CHARACTER_URL = "https://api.wynncraft.com/v3/player/"

MAX_CONTENT_KEY = "aspexis:wynncraft:max_stats"
MAX_CONTENT_TTL_SECONDS = 60 * 60 * 24


class MaxContent(BaseModel):
    level: int
    content: int
    discoveries: int
    quests: int
    world_events: int
    caves: int
    lootruns: int
    dungeons: int
    raids: int


def _parse_character_stats(character_data: dict) -> MaxContent | None:
    """
    Returns a MaxContent if all stats are present and non-None, otherwise None.
    Using a typed return here lets Pylance narrow correctly at the call site.
    """
    max_level = character_data.get("level")
    max_content = character_data.get("contentCompletion")
    max_discoveries = character_data.get("discoveries")
    max_quests = len(character_data.get("quests") or [])
    max_world_events = character_data.get("worldEvents")
    max_caves = character_data.get("caves")
    max_lootruns = character_data.get("lootruns")
    max_unique_dungeons = (
        get_dungeon_unique_completions(
            character_data.get("dungeons", {}).get("list", {}) or {}
        )
        or None
    )
    max_unique_raids = (
        len(character_data.get("raids", {}).get("list", {}) or []) or None
    )

    if (
        max_level is None
        or max_content is None
        or max_discoveries is None
        or max_world_events is None
        or max_caves is None
        or max_lootruns is None
        or max_unique_dungeons is None
        or max_unique_raids is None
    ):
        return None

    return MaxContent(
        level=max_level,
        content=max_content,
        discoveries=max_discoveries,
        world_events=max_world_events,
        quests=max_quests,
        caves=max_caves,
        lootruns=max_lootruns,
        dungeons=max_unique_dungeons,
        raids=max_unique_raids,
    )


async def _fetch_content_max(http_client: httpx.AsyncClient) -> MaxContent:
    print("Updating Wynncraft content max")
    leaderboard_response = await http_client.get(
        CONTENT_LEADERBOARD_URL,
        headers={"Authorization": f"Bearer {wynn_token}"},
    )
    try:
        leaderboard_response.raise_for_status()
    except httpx.TimeoutException:
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError:
        raise exceptions.UpstreamError()

    leaderboard_data = leaderboard_response.json()

    characters = leaderboard_data.values()

    for character in characters:
        # we loop through the characters until we find one that isn't restricted
        character_response = await http_client.get(
            f"{BASE_PLAYER_CHARACTER_URL}{character['uuid']}/characters/{character['characterUuid']}",
            headers={"Authorization": f"Bearer {wynn_token}"},
        )
        try:
            character_response.raise_for_status()
        except httpx.HTTPStatusError:
            # if request fails for any reason, try the next one
            continue

        character_data: dict = character_response.json()
        result = _parse_character_stats(character_data)
        if result is None:
            print(
                f"Character {character.get('uuid')} has restricted/missing stats, trying next"
            )
            continue

        return result
    raise exceptions.ServiceError()


async def update_content_max(http_client: httpx.AsyncClient, redis: Redis) -> None:
    """Updates Wynncraft Max content in Redis, should only be called by a scheduler"""
    data = await _fetch_content_max(http_client)
    json_data = data.model_dump_json()
    await redis.set(MAX_CONTENT_KEY, json_data, ex=MAX_CONTENT_TTL_SECONDS)
    print("successfully updated wynncraft max content")


async def get_wynncraft_content_max(
    http_client: httpx.AsyncClient, redis: Redis
) -> MaxContent:
    """Gets Wynncraft Max content, getting from Redis if available"""
    data = await redis.get(MAX_CONTENT_KEY)
    if data is None:
        data = await _fetch_content_max(http_client)
        json_data = data.model_dump_json()
        await redis.set(MAX_CONTENT_KEY, json_data, ex=MAX_CONTENT_TTL_SECONDS)
    else:
        data = json.loads(data)
        data = MaxContent(**data)

    return data


if __name__ == "__main__":
    print(asyncio.run(_fetch_content_max(httpx.AsyncClient())))
