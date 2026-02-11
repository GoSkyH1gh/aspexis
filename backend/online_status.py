import asyncio
import httpx
import logging
from dotenv import load_dotenv
from utils import dashify_uuid
import os
import exceptions
from pydantic import BaseModel
from typing import Optional, Dict, Any

load_dotenv()

logger = logging.Logger(__name__)


class PlayerStatus(BaseModel):
    wynncraft_restricted: bool
    wynncraft_online: bool
    wynncraft_server: str | None
    wynncraft_character: str | None
    hypixel_online: bool
    hypixel_game_type: str | None
    hypixel_mode: str | None


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

if hypixel_api_key is None:
    raise Exception("No Hypixel API Key found while getting status")


async def get_status(uuid: str) -> PlayerStatus:
    async with httpx.AsyncClient() as session:
        wynncraft_raw, hypixel_raw = await asyncio.gather(
            get_wynncraft_status(session, uuid),
            get_hypixel_status(session, uuid),
            return_exceptions=True,
        )

    # ---- Type narrowing: after this block, both vars are dict | None ----
    wynncraft_response: Optional[Dict[str, Any]] = None
    hypixel_response: Optional[Dict[str, Any]] = None

    # ---- Wynncraft ----
    if isinstance(wynncraft_raw, exceptions.NotFound):
        pass  # not found = no data
    elif isinstance(wynncraft_raw, exceptions.UpstreamError):
        raise
    elif isinstance(wynncraft_raw, BaseException):
        raise exceptions.ServiceError()
    else:
        wynncraft_response = wynncraft_raw

    # ---- Hypixel ----
    if isinstance(hypixel_raw, exceptions.NotFound):
        pass  # not found = no data
    elif isinstance(hypixel_raw, exceptions.UpstreamError):
        raise
    elif isinstance(hypixel_raw, BaseException):
        raise exceptions.ServiceError()
    else:
        hypixel_response = hypixel_raw

    # ---- Process Wynncraft ----
    wynncraft_online = False
    wynncraft_server = None
    wynncraft_restricted = False

    if wynncraft_response is not None:
        wynncraft_online = wynncraft_response.get("online", False)
        wynncraft_server = wynncraft_response.get("server")
        wynncraft_restricted = wynncraft_response.get("restrictions", {}).get(
            "onlineStatus", False
        )
        wynncraft_character = wynncraft_response.get("activeCharacter")

    # ---- Process Hypixel ----
    hypixel_online = False
    hypixel_game_type = None
    hypixel_mode = None

    if hypixel_response is not None:
        hypixel_data = hypixel_response.get("session", {})
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

    return PlayerStatus(
        wynncraft_restricted=wynncraft_restricted,
        wynncraft_online=wynncraft_online,
        wynncraft_server=wynncraft_server,
        wynncraft_character=wynncraft_character,
        hypixel_online=hypixel_online,
        hypixel_game_type=hypixel_game_type,
        hypixel_mode=hypixel_mode,
    )


async def get_wynncraft_status(client: httpx.AsyncClient, uuid: str):
    dashed_uuid = dashify_uuid(uuid)
    response = await client.get(
        f"https://api.wynncraft.com/v3/player/{dashed_uuid}",
        headers={"Authorization": f"Bearer {wynn_token}"},
    )

    if response.status_code == 404:
        raise exceptions.NotFound()

    response.raise_for_status()
    return response.json()


async def get_hypixel_status(client: httpx.AsyncClient, uuid: str):
    assert hypixel_api_key is not None, "Hypixel API Key is None, cannot fetch status"

    headers = {"API-Key": hypixel_api_key}
    params = {"uuid": uuid}

    response = await client.get(
        "https://api.hypixel.net/v2/status",
        params=params,
        headers=headers,
    )

    if (
        response.status_code == 404
    ):  # this doesn't ever return 404, TODO implement returning it manually
        raise exceptions.NotFound()

    if response.status_code == 429:
        raise exceptions.UpstreamError()

    response.raise_for_status()
    return response.json()
