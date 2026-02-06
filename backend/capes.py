from upstash_redis.asyncio import Redis
from dotenv import load_dotenv
import httpx
import json
from pydantic import BaseModel
import exceptions
import logging
from PIL import Image
import io
from utils import pillow_to_b64
import asyncio

load_dotenv()
logger = logging.getLogger(__name__)
redis = Redis.from_env()

browser_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


class GenericCapeData(BaseModel):
    type: str
    name: str  # this is the pretty name
    url: str
    removed: bool


class CapeImageData(BaseModel):
    front_b64: str
    back_b64: str


class UserCapeData(BaseModel):
    name: str
    url: str
    images: CapeImageData
    removed: bool


def proccess_generic_capes(cape_data) -> list[GenericCapeData]:
    capes: list[GenericCapeData] = []
    cape_data = json.loads(cape_data)
    for cape in cape_data:
        capes.append(
            GenericCapeData(
                type=cape.get("type"),
                name=cape.get("title"),
                url=cape.get("url"),
                removed=cape.get("removed", False),
            )
        )
    return capes


def get_cape_dictionary(cape_list: list[GenericCapeData]) -> dict[str, GenericCapeData]:
    cape_dict = {}
    for cape in cape_list:
        cape_dict[cape.type] = cape
    return cape_dict


async def get_generic_cape_data(client: httpx.AsyncClient) -> list[GenericCapeData]:
    """Fetches data from capes.me about all known capes and caches it in Redis."""
    cape_data_raw = await redis.get("generic_capes_me_data")
    if cape_data_raw:
        return proccess_generic_capes(cape_data_raw)

    try:
        response = await client.get(
            "https://capes.me/api/capes", timeout=10, headers=browser_headers
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error occurred: {e}")
        raise exceptions.UpstreamError()
    except httpx.TimeoutException as e:
        logger.error(f"Request timed out: {e}")
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError as e:
        logger.error(f"Request exception occurred: {e}")
        raise exceptions.UpstreamError()
    except Exception as e:
        logger.warning(f"something went wrong while getting capes from capes.me: {e}")
        raise exceptions.ServiceError()

    response_data = response.json()

    await redis.set(
        "generic_capes_me_data", json.dumps(response_data), ex=3600
    )  # cache for 1 hour

    return proccess_generic_capes(json.dumps(response_data))


async def get_capes_for_user(uuid: str, client: httpx.AsyncClient):
    """Fetches capes for a specific user by UUID."""

    user_cape_data_raw = await redis.get(f"user_capes_me_data_{uuid}")
    if user_cape_data_raw:
        capes = []
        for cape in json.loads(user_cape_data_raw):
            capes.append(UserCapeData(**cape))
        return capes

    try:
        response = await client.get(
            f"https://capes.me/api/user/{uuid}", timeout=10, headers=browser_headers
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        if response.status_code == 404:
            raise exceptions.NotFound()
        logger.error(f"HTTP error occurred: {e}")
        raise exceptions.UpstreamError()
    except httpx.TimeoutException as e:
        logger.error(f"Request timed out: {e}")
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError as e:
        logger.error(f"Request exception occurred: {e}")
        raise exceptions.UpstreamError()
    except Exception as e:
        logger.warning(f"something went wrong while getting capes from capes.me: {e}")
        raise exceptions.ServiceError()

    response_data = response.json()

    user_cape_data = response_data.get("capes", [])

    generic_cape_data = await get_generic_cape_data(client)
    cape_dictionary = get_cape_dictionary(
        generic_cape_data
    )  # this is to easily map cape type from capes.me to url

    user_capes: list[UserCapeData] = []
    
    # We can process these in parallel for better performance since they are independent I/O
    async def fetch_cape_image(cape):
        image_data = await get_cape_images(cape_dictionary[cape.get("type")].url, client)
        return UserCapeData(
            name=cape_dictionary[cape.get("type")].name,
            url=cape_dictionary[cape.get("type")].url,
            images=image_data,
            removed=cape.get("removed", False),
        )

    tasks = [fetch_cape_image(cape) for cape in user_cape_data]
    if tasks:
        user_capes = await asyncio.gather(*tasks)

    await redis.set(
        f"user_capes_me_data_{uuid}", json.dumps([cape.model_dump() for cape in user_capes]), ex=900
    )

    return user_capes


async def get_cape_images(cape_url: str, client: httpx.AsyncClient) -> CapeImageData:
    cape_data = await redis.get(f"cape_image_data_{cape_url}")
    if cape_data:
        cape_data_json = json.loads(cape_data)
        return CapeImageData(**cape_data_json)

    try:
        response = await client.get(cape_url, timeout=10)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error occurred: {e}")
        raise exceptions.UpstreamError()
    except httpx.TimeoutException as e:
        logger.error(f"Request timed out: {e}")
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError as e:
        logger.error(f"Request exception occurred: {e}")
        raise exceptions.UpstreamError()
    except Exception as e:
        logger.warning(
            f"something went wrong while getting cape image from mojang: {e}"
        )
        raise exceptions.ServiceError()

    cape_bytes = io.BytesIO(response.content)
    full_cape_image = Image.open(cape_bytes)

    crop_area = (1, 1, 11, 17)
    cape_showcase = full_cape_image.crop(crop_area)

    crop_area = (12, 1, 22, 17)
    cape_back = full_cape_image.crop(crop_area)

    cape_front_b64 = pillow_to_b64(cape_showcase)
    cape_back_b64 = pillow_to_b64(cape_back)

    full_cape_data = CapeImageData(
        front_b64=cape_front_b64,
        back_b64=cape_back_b64,
    )

    await redis.set(
        f"cape_image_data_{cape_url}", full_cape_data.model_dump_json(), ex=86400
    )  # cache for 24 hours

    return full_cape_data


if __name__ == "__main__":
    async def main():
        async with httpx.AsyncClient() as client:
            print(await get_capes_for_user("3ff2e63ad63045e0b96f57cd0eae708d", client))

    asyncio.run(main())
