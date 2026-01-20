import asyncio
import aiohttp
import logging
from dotenv import load_dotenv
from utils import dashify_uuid
import os

load_dotenv()

logger = logging.Logger(__name__)

hypixel_api_key = os.getenv("hypixel_api_key")

if hypixel_api_key is None:
    raise Exception("No Hypixel API Key found while getting status")


async def get_online_status(uuid: str):
    assert hypixel_api_key is not None, "No Hypixel API Key found while getting status"
    async with aiohttp.ClientSession() as session:
        tasks = [
            get_wynncraft_status(session, uuid),
            get_hypixel_status(session, uuid, hypixel_api_key),
        ]

        responses = await asyncio.gather(*tasks, return_exceptions=True)

    wynncraft_status = False
    hypixel_status = False

    wynncraft_response = responses[0]
    if isinstance(wynncraft_response, BaseException):
        logger.warning(f"Error fetching Wynncraft status: {wynncraft_response}")
    elif wynncraft_response["online"]:
        wynncraft_status = True
        logger.info(f"{uuid} is online on wynncraft")
    elif not wynncraft_response["online"]:
        logger.info(f"{uuid} is not online on wynncraft")

    hypixel_response = responses[1]
    if isinstance(hypixel_response, BaseException):
        logger.warning(f"Error fetching Hypixel status: {hypixel_response}")
    elif hypixel_response["session"]["online"]:
        hypixel_status = True
        logger.info(f"{uuid} is online on hypixel")
    elif not hypixel_response["session"]["online"]:
        logger.info(f"{uuid} is not online on hypixel")

    if wynncraft_status:
        return {"status": "Online (Wynncraft)"}
    elif hypixel_status:
        return {"status": "Online (Hypixel)"}
    else:
        return {"status": "Offline"}


async def get_wynncraft_status(session: aiohttp.ClientSession, uuid: str):
    dashed_uuid = dashify_uuid(uuid)
    try:
        async with session.get(
            f"https://api.wynncraft.com/v3/player/{dashed_uuid}"
        ) as response:
            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
            return await response.json()
    except Exception as e:
        logger.error(f"Wynncraft API request failed for {dashed_uuid}: {e}")
        # Re-raise the exception so asyncio.gather can catch it
        raise


async def get_hypixel_status(session: aiohttp.ClientSession, uuid: str, api_key: str):
    try:
        headers = {"API-Key": api_key}
        params = {"uuid": uuid}
        async with session.get(
            "https://api.hypixel.net/v2/status", params=params, headers=headers
        ) as response:
            response.raise_for_status()
            return await response.json()
    except Exception as e:
        logger.error(f"Hypixel status API request failed for {uuid}: {e}")
        raise
