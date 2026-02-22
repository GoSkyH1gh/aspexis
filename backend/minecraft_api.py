from utils import pillow_to_b64, check_valid_uuid
import re
import json
import base64
import io
import asyncio
import httpx
from PIL import Image
import logging
from pydantic import BaseModel
from typing import Optional
import exceptions


class MojangData(BaseModel):
    source: str
    username: str
    uuid: str
    has_cape: bool
    cape_name: Optional[str]
    skin_url: str
    cape_url: Optional[str]
    skin_showcase_b64: str
    cape_front_b64: Optional[str]
    cape_back_b64: Optional[str]


logger = logging.getLogger(__name__)

# the last 32 characters of the cape url recieved from mojang with a corresponding name
CAPE_MAP = {
    "71658f2180f56fbce8aa315ea70e2ed6": "Minecon 2011",
    "273c4f82bc1b737e934eed4a854be1b6": "Minecon 2012",
    "943239b1372780da44bcbb29273131da": "Minecon 2013",
    "65a13a603bf64b17c803c21446fe1635": "Minecon 2015",
    "59c0cd0ea42f9999b6e97c584963e980": "Minecon 2016",
    "29304776d0f347334f8a6eae509f8a56": "Realms Mapmaker",
    "53cddd0995d17d0da995662913fb00f7": "Mojang Studios",
    "995751e91cee373468c5fbf4865e7151": "Mojang",
    "2abb2051b2481d0ba7defd635ca7a933": "Migrator",
    "e1a76d397c8b9c476c2f77cb6aebb1df": "MCC 15th Year",
    "cd50e4b2954ab29f0caeb85f96bf52a1": "Founder's",
    "8f1e3966956123ccb574034c06f5d336": "Pan",
    "a4faa4d9a9c3d6af8eafb377fa05c2bb": "Blossom",
    "8886e3b7722a895255fbf22ab8652434": "Minecraft Experience",
    "b4b6559b0e6d3bc71c40c96347fa03f0": "Common",
    "a22e3412e84fe8385a0bdd73dc41fa89": "Yearn",
    "0a7ca74936ad50d8e860152e482cfbde": "Purple Heart",
    "b1e6d35f4f3cfb0324ef2d328223d350": "Follower",
    "91c359e9e61a31f4ce11c88f207f0ad4": "Vanilla",
    "9f1bc1523a0dcdc16263fab150693edd": "Home",
    "12d3aeebc3c192054fba7e3b3f8c77b1": "Menace",
    "a7540e117fae7b9a2853658505a80625": "15th Anniversary",
    "76b9eb7a8f9f2fe6659c23a2d8b18edf": "Millionth Customer",
    "a4ef76ebde88d27e4d430ac211df681e": "Translator",
    "fb45ea81e785a7854ae8429d7236ca26": "Office",
    "93199a2ee9e1585cb8d09d6f687cb761": "Mojang (Legacy)",
    "26b546a54d519e6a3ff01efa01acce81": "Cobalt",
    "e926b997d5e66c86483dfb1e031aee95": "Turtle",
    "3a37ff2a14c2d157c659a07810b1bdca": "Copper",
}


class GetMojangAPIData:
    def __init__(self, client: httpx.AsyncClient, username: str | None, uuid: str | None = None):
        self.username = username
        self.uuid = uuid
        self.skin_url = None
        self.cape_url = None
        self.has_cape = None
        self.skin_id = None
        self.cape_name = None
        self.cape_back = None
        self.cape_showcase = None
        self.skin_showcase_b64 = None
        self.cape_back_b64 = None
        self.cape_showcase_b64 = None
        self.cape_showcase_b64 = None
        self.client = client

    async def get_data(self) -> MojangData:
        """
        master function, gets uuid if not provided and then calls get_skin_data
        returns a MojangData object on success
        """
        if self.uuid is not None:
            if not check_valid_uuid(self.uuid):
                raise exceptions.InvalidUserUUID()

        if self.uuid is None:
            await self.get_uuid()

        await self.get_skin_data()
        await self.get_skin_images()

        try:
            player_profile = MojangData(
                source="mojang_api",
                username=self.username,
                uuid=self.uuid,
                has_cape=self.has_cape,
                skin_showcase_b64=self.skin_showcase_b64,
                cape_name=self.cape_name,
                skin_url=self.skin_url,
                cape_url=self.cape_url,
                cape_front_b64=self.cape_showcase_b64,
                cape_back_b64=self.cape_back_b64,
            )
        except Exception as e:
            logger.error(f"Could not build object MojangData: {e}")
            raise exceptions.ServiceError()

        return player_profile

    async def get_uuid(self) -> str:
        """
        receives uuid based on username
        """
        if self.username is None or not re.match(
            r"^[a-zA-Z0-9_]{1,16}$", self.username
        ):
            raise exceptions.NotFound()

        try:
            uuid_response_raw = await self.client.get(
                f"https://api.minecraftservices.com/minecraft/profile/lookup/name/{self.username}",
                timeout=10,
            )
            uuid_response_raw.raise_for_status()

            uuid_response: dict = uuid_response_raw.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code in [400, 404]:
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
            logger.warning(f"something went wrong while getting Minecraft UUID: {e}")
            raise exceptions.ServiceError()

        self.uuid = uuid_response["id"]
        self.username = uuid_response["name"]
        return self.uuid

    async def get_skin_data(self) -> None:
        """
        This function receives data about the skin and cape, requires UUID
        structure is here because it's confusing: https://minecraft.wiki/w/Mojang_API#Query_player's_skin_and_cape
        but basically there's a main json which contains a value that is base64 encoded
        that is where skin and cape data are (another json)
        """

        try:
            player_profile_raw = await self.client.get(
                f"https://sessionserver.mojang.com/session/minecraft/profile/{self.uuid}",
                timeout=10,
            )
            player_profile_raw.raise_for_status()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
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
            logger.warning(
                f"something went wrong while getting Minecraft skin data: {e}"
            )
            raise exceptions.ServiceError()
        if not player_profile_raw.text:
            raise exceptions.NotFound()

        player_profile: dict = player_profile_raw.json()
        logger.info("request success for getting skin and cape data!")

        # gets a list which contains a dictionary
        self.username = player_profile.get("name")
        base64_text = player_profile["properties"][0]["value"]
        decoded_base64_text = base64.b64decode(base64_text)  # this is a bytes object
        decoded_base64_string = decoded_base64_text.decode(
            "utf-8"
        )  # this is a string in UTF-8

        # now that we have the decoded string, we can finally get the urls
        properties_json: dict = json.loads(decoded_base64_string)

        self.skin_url = properties_json.get("textures", {}).get("SKIN", {}).get("url")
        logger.info(f"skin link: {self.skin_url}")

        self.cape_url = properties_json.get("textures", {}).get("CAPE", {}).get("url")
        if self.cape_url is not None:
            self.has_cape = True
            logger.info(f"cape link: {self.cape_url}")
        else:
            self.has_cape = False

    async def get_skin_images(self):
        """
        This downloads the images from skin url and optionally cape url(if it exists)
        """
        # Prepare fetch tasks
        skin_task = self.client.get(self.skin_url)
        cape_task = None
        if self.has_cape:
            cape_task = self.client.get(self.cape_url)

        try:
            # Execute fetches concurrently
            if cape_task:
                response_skin, response_cape = await asyncio.gather(skin_task, cape_task)
            else:
                response_skin = await skin_task
                response_cape = None

            # Process skin
            skin_bytes = io.BytesIO(response_skin.content)
            full_skin_image = Image.open(skin_bytes)
            logger.debug("skin image opened successfully")

            try:
                crop_area = (8, 8, 16, 16)
                self.skin_showcase = full_skin_image.crop(crop_area)  # base skin face

                crop_area = (40, 8, 48, 16)
                skin_showcase_overlay = full_skin_image.crop(crop_area)  # skin face overlay
                _, _, _, alpha_mask = skin_showcase_overlay.split()

                paste_area = (0, 0)
                self.skin_showcase.paste(
                    skin_showcase_overlay, paste_area, mask=alpha_mask
                )

                self.skin_showcase_b64 = pillow_to_b64(self.skin_showcase)

            except Exception as e:
                logger.error(f"something went wrong while cropping skin image: {e}")

            # Process cape if available
            if self.has_cape and response_cape:
                try:
                    cape_bytes = io.BytesIO(response_cape.content)
                    full_cape_image = Image.open(cape_bytes)  # uncropped cape image
                    logger.info("cape image opened successfully")
                except Exception as e:
                    logger.error(f"something went wrong while fetching cape image: {e}")

                try:
                    crop_area = (1, 1, 11, 17)
                    self.cape_showcase = full_cape_image.crop(crop_area)
                except Exception as e:
                    logger.error(f"something went wrong while cropping cape image: {e}")

                try:
                    crop_area = (12, 1, 22, 17)
                    self.cape_back = full_cape_image.crop(crop_area)
                except Exception as e:
                    logger.error(f"something went wrong while cropping back of cape: {e}")

                self.cape_showcase_b64 = pillow_to_b64(self.cape_showcase)
                self.cape_back_b64 = pillow_to_b64(self.cape_back)

                raw_cape_data = self.cape_url[-32:]
                try:
                    logger.info(f"trying to access {raw_cape_data}")
                    self.cape_name = CAPE_MAP[raw_cape_data]
                    logger.info(f"Identified {self.cape_name} cape!")
                except KeyError:
                    logger.warning("Cape not regonized")
                    self.cape_name = "Unknown cape"

                return self.skin_showcase_b64, self.cape_showcase_b64, self.cape_back_b64

            else:
                logger.info(f"no cape for user {self.username}")
                return self.skin_showcase_b64, None, None

        except Exception as e:
            logger.error(f"something went wrong in get_skin_images: {e}")
            # If main skin fails we probably should return something or raise, 
            # but strict preservation of behavior suggests swallowing 
            # (though the original code swallowed exceptions somewhat liberally)


if __name__ == "__main__":
    pass
    # instance = GetMojangAPIData("goskyhigh")
    # print(instance.get_data())
    # user = GetMojangAPIData(None, "d63a3a136e8a43e6918fddc5a1eb6c84")
    # print(user.get_data())
