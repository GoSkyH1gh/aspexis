import httpx
import asyncio
from dotenv import load_dotenv
import os
from pydantic import BaseModel
from fastapi import HTTPException
from metrics_manager import add_value, get_engine
from minecraft_manager import get_minecraft_data


load_dotenv()

donut_api_key = os.getenv("donut_api_key")

if not donut_api_key:
    raise RuntimeError("Donut API key not set in environment variables.")


class DonutPlayerStats(BaseModel):
    money: int
    shards: int
    kills: int
    deaths: int
    playtime_hours: float
    placed_blocks: int
    broken_blocks: int
    mobs_killed: int
    money_spent: int
    money_earned: int
    online: bool


async def get_donut_stats(
    username: str, http_client: httpx.AsyncClient
) -> DonutPlayerStats:
    """Returns a DonutPlayerStats object on success, 404 on fail"""
    assert donut_api_key is not None, "Donut API key not found"
    try:
        donut_response_raw = await http_client.get(
            f"https://api.donutsmp.net/v1/stats/{username}",
            headers={"Authorization": donut_api_key},
        )
        donut_response_raw.raise_for_status()
        donut_response = donut_response_raw.json()

        online_status = await get_donut_status(username, http_client)

    except Exception as e:
        print(f"could not retrieve stats: {e}")
        raise HTTPException(404, {"message": f"player {username} was not found"})

    stats_to_convert = {
        "money": "money",
        "shards": "shards",
        "kills": "kills",
        "deaths": "deaths",
        "placed_blocks": "placed_blocks",
        "broken_blocks": "broken_blocks",
        "mobs_killed": "mobs_killed",
        "money_spent_on_shop": "money_spent",
        "money_made_from_sell": "money_earned",
    }

    converted_stats = {}

    for stat in stats_to_convert:
        try:
            raw_stat = donut_response["result"][stat]
            converted_stat = int(float(raw_stat))
            # the reason to float and then int is because money_earned_from_sell
            # can be a float and that cant be directly converted to an int
        except Exception as e:
            print(f"conversion failed for {stat}: {e}")
            converted_stat = 0  # if conversion fails reset to 0

        converted_stats[stats_to_convert[stat]] = converted_stat

    try:
        playtime_milliseconds = int(donut_response["result"]["playtime"])
        playtime_hours = playtime_milliseconds / 3600000
        playtime_hours = round(playtime_hours, 1)
    except Exception as e:
        print(f"could not convert playtime, setting playtime as 0: {e}")
        playtime_hours = 0

    player_stats = DonutPlayerStats(
        money=converted_stats["money"],
        shards=converted_stats["shards"],
        kills=converted_stats["kills"],
        deaths=converted_stats["deaths"],
        playtime_hours=playtime_hours,
        placed_blocks=converted_stats["placed_blocks"],
        broken_blocks=converted_stats["broken_blocks"],
        mobs_killed=converted_stats["mobs_killed"],
        money_spent=converted_stats["money_spent"],
        money_earned=converted_stats["money_earned"],
        online=online_status,
    )
    return player_stats


async def get_donut_status(username: str, http_client: httpx.AsyncClient) -> bool:
    """Returns true if the player is online, false if offline"""
    # so the donutapi is really dumb it only shows rank if the player is online like who designed this 💀
    assert donut_api_key is not None, "Donut API key not found"
    try:
        donut_status_response = await http_client.get(
            f"https://api.donutsmp.net/v1/lookup/{username}",
            headers={"Authorization": donut_api_key},
        )

        if (
            donut_status_response.status_code == 500
        ):  # if the player is offline, the server returns a 500
            return False

        donut_status_response.raise_for_status()

        if donut_status_response.json()["result"] is not None:
            return True
    except Exception as e:
        print(f"could not retrieve status: {e}")
        return False
    return False


async def add_donut_stats_to_db(
    data: DonutPlayerStats, username, session, http_client: httpx.AsyncClient
) -> None:
    if not isinstance(data, DonutPlayerStats):
        print("Couldn't add donut data to db because it's not DonutPlayerStats")
        return

    stats_to_add = {
        12: data.playtime_hours,
        13: data.kills,
        14: data.deaths,
        15: data.money,
        16: data.money_spent,
        17: data.money_earned,
        18: data.shards,
        19: data.broken_blocks,
        20: data.placed_blocks,
    }

    try:
        mojang_data = await get_minecraft_data(username, session, http_client)
        uuid = mojang_data.uuid
    except HTTPException:
        print(
            f"Donut Stats: an HTTP Exception happened while fetching uuid for {username}; not adding to db"
        )
        return

    if uuid is None:
        print(
            f"Donut Stats: could not get uuid for player {username}; not adding to db"
        )
        return

    def write_to_db_sync():
        engine = get_engine()
        with engine.begin() as conn:
            for stat in stats_to_add:
                if stats_to_add.get(stat, None) is not None:
                    add_value(conn, uuid, stat, stats_to_add[stat])

    await asyncio.to_thread(write_to_db_sync)


if __name__ == "__main__":
    data = asyncio.run(get_donut_stats("2b3t", httpx.AsyncClient()))
    print(data)
