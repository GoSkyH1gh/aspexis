import asyncio
from typing import Dict, Set, Optional
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
from utils import dashify_uuid
import exceptions
from fastapi import HTTPException

load_dotenv()

wynn_token = os.getenv("WYNN_TOKEN")
hypixel_api_key = os.getenv("hypixel_api_key")

if not wynn_token:
    raise RuntimeError("Wynncraft Token not set in environment variables.")

if not hypixel_api_key:
    raise RuntimeError("Hypixel Api key not set in environment vairables.")

hypixel_game_type_map = {  # probably not all of them but it's the main ones
    "Skyblock": "SkyBlock",
    "Murder_mystery": "Murder Mystery",
    "Tntgames": "TNT Games",
    "Build_battle": "Build Battle",
    "Uhc": "UHC",
    "Legacy": "Classic Games",
    "Mcgo": "Cops and Crims",
    "Walls3": "Mega Walls",
    "Super_smash": "Smash Heroes",
    "Battleground": "Warlords",
    "Survival_games": "Blitz Survival Games",
}

hypixel_mode_map = {  # only for skyblock atm
    "Dynamic": "Private Island",
    "Hub": "Hub",
    "Dungeon_hub": "Dungeon Hub",
    "Farming_1": "The Farming Islands",
    "Foraging_1": "The Park",
    "Foraging_2": "Moonglade Marsh",
    "Mining_1": "Gold Mine",
    "Mining_2": "Deep Caverns",
    "Mining_3": "Dwarven Mines",
    "Crystal_hollows": "Crystal Hollows",
    "Combat_1": "Spider's Den",
    "Combat_3": "End",
    "Crimson_isle": "Crimson Isle",
    "Garden": "Garden",
    "Rift": "Rift",
    "Fishing_1": "Backwater Bayou",
}


class PlayerStatus(BaseModel):
    wynncraft_restricted: bool
    wynncraft_online: bool
    wynncraft_server: Optional[str]
    hypixel_online: bool
    hypixel_game_type: Optional[str]
    hypixel_mode: Optional[str]


trackers: Dict[str, asyncio.Task] = {}  # uuid, poller
subscribers: Dict[str, Set[asyncio.Queue]] = {}  # uuid, queue
ignored_sources: Dict[str, Set[str]] = {}  # uuid, set["wynncraft", "hypixel"]


async def poller(uuid: str):
    print(f"poller started for {uuid}")
    try:
        while True:
            try:
                data = await get_status(uuid)
                message = f"event: data\ndata: {data.model_dump_json()}\n\n"
            except:
                message = "event: error\ndata: {}\n\n"

            for subscriber in list(subscribers.get(uuid, [])):
                await subscriber.put(message)

            await asyncio.sleep(60)
    except asyncio.CancelledError:
        print(f"poller for uuid {uuid} stopped")
    except Exception as e:
        print(f"something went wrong in poller: {e}")


async def subscribe(uuid: str):
    queue = asyncio.Queue()

    if uuid not in subscribers:
        subscribers[uuid] = set()

    subscribers[uuid].add(queue)

    if uuid not in ignored_sources:
        ignored_sources[uuid] = set()

    if uuid not in trackers:
        task = asyncio.create_task(poller(uuid))
        trackers[uuid] = task

    return queue


def unsubscribe(uuid: str, queue: asyncio.Queue):
    if uuid not in subscribers:
        return

    subscribers[uuid].discard(queue)

    if len(subscribers[uuid]) == 0:
        del subscribers[uuid]
        del ignored_sources[uuid]

        if uuid in trackers:
            task = trackers[uuid]
            task.cancel()
            del trackers[uuid]


async def get_status(uuid) -> PlayerStatus:
    print(f"ignored sources: {ignored_sources[uuid]}")
    async with httpx.AsyncClient() as session:
        results = await asyncio.gather(
            get_wynncraft_status(session, uuid),
            get_hypixel_status(session, uuid),
            return_exceptions=True,
        )
    wynncraft_response = results[0]
    hypixel_response = results[1]

    print(hypixel_response)

    if isinstance(wynncraft_response, exceptions.NotFound):
        print(f"Adding Wynncraft to ignored_sources for uuid {uuid}")
        ignored_sources[uuid].add("wynncraft")
    elif isinstance(wynncraft_response, HTTPException):
        raise exceptions.UpstreamError()

    if isinstance(hypixel_response, exceptions.NotFound):
        print(f"Adding Hypixel to ignored_sources for uuid {uuid}")
        ignored_sources[uuid].add("hypixel")
    elif isinstance(hypixel_response, HTTPException):
        raise exceptions.UpstreamError()

    try:
        wynncraft_online = False
        wynncraft_server = None
        wynncraft_restricted = False
        if wynncraft_response is not None and not isinstance(
            wynncraft_response, HTTPException
        ):
            wynncraft_online = wynncraft_response.get("online")
            wynncraft_server = wynncraft_response.get("server")
            wynncraft_restricted = wynncraft_response.get("restrictions", {}).get(
                "onlineStatus", False
            )
    except Exception as e:
        print(f"tracker: something went wrong while proccessing wynncraft data: {e}")

    try:
        hypixel_online = False
        hypixel_game_type = None
        hypixel_mode = None
        if hypixel_response is not None and not isinstance(
            hypixel_response, HTTPException
        ):
            hypixel_data: dict = hypixel_response.get("session", {})
            hypixel_online = hypixel_data.get("online", False)

            hypixel_game_type = hypixel_data.get(
                "gameType"
            )  # eg SKYBLOCK, PROTOTYPE, BEDWARS
            if isinstance(hypixel_game_type, str):
                hypixel_game_type = hypixel_game_type.capitalize()
                hypixel_game_type = hypixel_game_type_map.get(
                    hypixel_game_type, hypixel_game_type
                )

            hypixel_mode = hypixel_data.get("mode")  # eg LOBBY, hub
            if isinstance(hypixel_mode, str):
                hypixel_mode = hypixel_mode.capitalize()
                hypixel_mode = hypixel_mode_map.get(hypixel_mode, hypixel_mode)
    except Exception as e:
        print(f"tracker: something went wrong while proccessing hypixel data: {e}")

    player_status = PlayerStatus(
        wynncraft_restricted=wynncraft_restricted,
        wynncraft_online=wynncraft_online,
        wynncraft_server=wynncraft_server,
        hypixel_online=hypixel_online,
        hypixel_game_type=hypixel_game_type,
        hypixel_mode=hypixel_mode,
    )
    print(player_status)
    return player_status


async def get_wynncraft_status(client: httpx.AsyncClient, uuid):
    if "wynncraft" in ignored_sources[uuid]:
        print("wynncraft is ignored, passing")
        return None
    dashed_uuid = dashify_uuid(uuid)
    response = await client.get(
        f"https://api.wynncraft.com/v3/player/{dashed_uuid}",
        headers={"Authorization": f"Bearer {wynn_token}"},
    )
    if response.status_code == 404:
        raise exceptions.NotFound()
    response.raise_for_status()
    return response.json()


async def get_hypixel_status(client: httpx.AsyncClient, uuid):
    if "hypixel" in ignored_sources[uuid]:
        return None
    headers = {"API-Key": hypixel_api_key}
    params = {"uuid": uuid}

    response = await client.get(
        "https://api.hypixel.net/v2/status", params=params, headers=headers
    )
    if (
        response.status_code == 404
    ):  # this doesn't ever return 404, TODO implement returning it manually
        raise exceptions.NotFound()
    if response.status_code == 429:
        raise exceptions.UpstreamError()
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":
    asyncio.run(get_status("3ff2e63ad63045e0b96f57cd0eae708d"))
