import requests
import datetime
from dotenv import load_dotenv
import os
import logging
import exceptions
from pydantic import BaseModel
from typing import Optional, List
import math

logger = logging.getLogger(__name__)

load_dotenv()


rank_map = {
    "VIP": "VIP",
    "VIP_PLUS": "VIP+",
    "MVP": "MVP",
    "MVP_PLUS": "MVP+",
    "YOUTUBER": "YouTube",
}

# bedwars

XP_PER_STANDARD_BEDWARS_LEVEL = 5000
XP_PER_BEDWARS_PRESTIGE = 487000
XP_EASY_LEVELS_BEDWARS = [500, 1000, 2000, 3500]

bedwars_modes = ["overall", "eight_one", "eight_two", "four_three", "four_four"]
# combined like "eight_one" + "_" + "beds_lost_bedwars"
bedwars_stats_map = {
    "games_played_bedwars": "games_played",
    "winstreak": "winstreak",
    "wins_bedwars": "wins",
    "losses_bedwars": "losses",
    "kills_bedwars": "kills",
    "deaths_bedwars": "deaths",
    "final_kills_bedwars": "final_kills",
    "final_deaths_bedwars": "final_deaths",
    "beds_broken_bedwars": "beds_broken",
    "beds_lost_bedwars": "beds_lost",
    "_items_purchased_bedwars": "items_purchased",
    # resources
    "resources_collected_bedwars": "resources_collected",
    "iron_resources_collected_bedwars": "iron_collected",
    "gold_resources_collected_bedwars": "gold_collected",
    "diamond_resources_collected_bedwars": "diamonds_collected",
    "emerald_resources_collected_bedwars": "emeralds_collected",
}


class BedwarsMode(BaseModel):
    games_played: int
    winstreak: int
    wins: int
    losses: int
    winn_loss_ratio: float
    kills: int
    deaths: int
    kill_death_ratio: float
    final_kills: int
    final_deaths: int
    final_kill_death_ratio: float
    beds_broken: int
    beds_lost: int
    bed_broken_lost_ratio: float
    items_purchased: int
    # Resources
    resources_collected: int
    iron_collected: int
    gold_collected: int
    diamonds_collected: int
    emeralds_collected: int


class BedwarsProfile(BaseModel):
    experience: int
    level: int
    tokens: int
    overall_stats: BedwarsMode
    solo_stats: BedwarsMode
    duo_stats: BedwarsMode
    trio_stats: BedwarsMode
    quad_stats: BedwarsMode


class HypixelPlayer(BaseModel):
    source: str
    uuid: str
    first_login: Optional[str]
    last_login: Optional[str]
    rank: Optional[str]
    achievement_points: int
    network_experience: int
    network_level: int
    karma: int
    bedwars: BedwarsProfile


class HypixelGuildMember(BaseModel):
    uuid: str
    rank: str
    joined: str

class HypixelGuildMemberFull(BaseModel):
    username: str
    uuid: str
    rank: str
    joined: str
    skin_showcase_b64: str

class HypixelGuild(BaseModel):
    source: str
    name: str
    id: str
    created: str
    experience: int
    tag: Optional[str]
    description: Optional[str]
    publicly_listed: bool
    members: List[HypixelGuildMember]


class HypixelFullData(BaseModel):
    player: HypixelPlayer
    guild: Optional[HypixelGuild]


def get_core_hypixel_data(
    uuid, hypixel_api_key=None
) -> HypixelPlayer:
    payload = {"uuid": uuid}

    if hypixel_api_key is None:
        hypixel_api_key = os.getenv("hypixel_api_key")

    try:
        player_data_raw = requests.get(
            url="https://api.hypixel.net/v2/player",
            params=payload,
            headers={"API-Key": hypixel_api_key},
            timeout=10,
        )

        player_data_raw.raise_for_status()

        player_data: dict = player_data_raw.json()

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            logger.error(f"Invalid API key: {e}")
            raise exceptions.ServiceAPIKeyError()
        else:
            logger.error(f"HTTP error occurred: {e}")
            raise exceptions.UpstreamError()
    except requests.exceptions.Timeout as e:
        logger.error(f"Request timed out: {e}")
        raise exceptions.UpstreamTimeoutError()
    except requests.exceptions.RequestException as e:
        logger.error(f"Request exception occurred: {e}")
        raise exceptions.UpstreamError()
    except Exception as e:
        logger.warning(f"something went wrong while getting Hypixel player data: {e}")
        raise exceptions.ServiceError()

    if player_data.get("player") is None:
        raise exceptions.NotFound()

    player: dict = player_data.get("player", {})

    first_login = convert_unix_milliseconds_to_UTC(player.get("firstLogin"))
    last_login = convert_unix_milliseconds_to_UTC(player.get("lastLogin"))

    player_rank = player.get("rank")
    if player_rank is None:
        player_rank = player.get("newPackageRank")

    player_rank = rank_map.get(player_rank, player_rank)

    achievement_points = player.get("achievementPoints", 0)
    karma = player.get("karma", 0)

    network_experience = player.get("networkExp", 0)
    base_level = (
        math.sqrt((network_experience / 1250) + 12.25) - 3.5
    )  # logic: https://hypixel.net/threads/guide-network-level-equations.3412241/
    network_level = int(base_level) + 1  # base_level starts from 0

    player_profile = HypixelPlayer(
        source="hypixel_api",
        uuid=uuid,
        first_login=first_login,
        last_login=last_login,
        rank=player_rank,
        achievement_points=achievement_points,
        network_experience=network_experience,
        network_level=network_level,
        karma=karma,
        bedwars=get_bedwars_profile(player_data),
    )
    return player_profile


def get_bedwars_profile(player_data: dict) -> BedwarsProfile:
    bedwars_data: dict = (
        player_data.get("player", {}).get("stats", {}).get("Bedwars", {})
    )

    mode_stats = {}

    for mode in bedwars_modes:
        mode_stats[mode] = get_bedwars_mode_data(mode, bedwars_data)

    bedwars_profile = BedwarsProfile(
        experience=bedwars_data.get("Experience", 0),
        level=calculate_bedwars_level(bedwars_data.get("Experience", 0)),
        tokens=bedwars_data.get("coins", 0),  # coins were renamed to tokens
        overall_stats=mode_stats["overall"],
        solo_stats=mode_stats["eight_one"],
        duo_stats=mode_stats["eight_two"],
        trio_stats=mode_stats["four_three"],
        quad_stats=mode_stats["four_four"],
    )

    return bedwars_profile


def get_bedwars_mode_data(mode, bedwars_data) -> BedwarsMode:
    """Creates a BedwarsMode pydantic model for a mode"""
    mode_data = {}
    for raw_key, model_key in bedwars_stats_map.items():
        if mode == "overall":
            full_raw_key = raw_key
        else:
            full_raw_key = f"{mode}_{raw_key}"

        mode_data[model_key] = bedwars_data.get(full_raw_key, 0)

    # ratios
    mode_data["winn_loss_ratio"] = (
        round(mode_data["wins"] / mode_data["losses"], 2)
        if mode_data["losses"] > 0
        else 0.0
    )
    mode_data["kill_death_ratio"] = (
        round(mode_data["kills"] / mode_data["deaths"], 2)
        if mode_data["deaths"] > 0
        else 0.0
    )
    mode_data["final_kill_death_ratio"] = (
        round(mode_data["final_kills"] / mode_data["final_deaths"], 2)
        if mode_data["final_deaths"] > 0
        else 0.0
    )
    mode_data["bed_broken_lost_ratio"] = (
        round(mode_data["beds_broken"] / mode_data["beds_lost"], 2)
        if mode_data["beds_lost"] > 0
        else 0.0
    )

    return BedwarsMode(**mode_data)


def calculate_bedwars_level(experience) -> int:
    if experience <= 0:
        return 0

    # info: https://hypixel.net/threads/bedwars-level-experience-guide-2023-updated-version.5431988/
    prestiges = experience // XP_PER_BEDWARS_PRESTIGE

    level = prestiges * 100

    remaining_xp = (
        experience % XP_PER_BEDWARS_PRESTIGE
    )  # this will always be < 100 levels

    for level_xp_required in XP_EASY_LEVELS_BEDWARS:
        if remaining_xp > level_xp_required:
            remaining_xp -= level_xp_required
            level += 1

    level += remaining_xp // 5000  # adding the rest of the levels
    return int(level)


def get_guild_data(uuid: str = None, id: str = None) -> HypixelGuild:
    try:
        if uuid is None and id is None:
            raise exceptions.InvalidUserUUID()
        if uuid is not None:
            payload = {"player": uuid}
        if id is not None:
            payload = {"id": id}

        guild_data_raw = requests.get(
            url="https://api.hypixel.net/v2/guild",
            params=payload,
            headers={"API-Key": os.getenv("hypixel_api_key")},
            timeout=10,
        )

        guild_data_raw.raise_for_status()

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            logger.error(f"Invalid API key: {e}")
            raise exceptions.ServiceAPIKeyError()
        else:
            logger.error(f"HTTP error occurred: {e}")
            raise exceptions.UpstreamError()
    except requests.exceptions.Timeout as e:
        logger.error(f"Request timed out: {e}")
        raise exceptions.UpstreamTimeoutError()
    except requests.exceptions.RequestException as e:
        logger.error(f"Request exception occurred: {e}")
        raise exceptions.UpstreamError()
    except Exception as e:
        logger.warning(f"something went wrong while getting Hypixel guild data: {e}")
        raise exceptions.ServiceError()

    guild_data: dict = guild_data_raw.json().get("guild")

    if guild_data is None:
        raise exceptions.NotFound()

    members = guild_data.get("members", [])

    guild_members = []
    for member in members:
        guild_members.append(
            HypixelGuildMember(
                uuid=member.get("uuid"),
                rank=member.get("rank"),
                joined=convert_unix_milliseconds_to_UTC(member.get("joined")),
            )
        )

    guild_profile = HypixelGuild(
        source="hypixel_api",
        name=guild_data.get("name"),
        members=guild_members,
        id=guild_data.get("_id"),
        created=convert_unix_milliseconds_to_UTC(guild_data.get("created")),
        experience=guild_data.get("exp", 0),
        tag=guild_data.get("tag"),
        description=guild_data.get("description"),
        publicly_listed=guild_data.get("publiclyListed", False),
    )

    return guild_profile


def convert_unix_milliseconds_to_UTC(timestamp: int) -> Optional[str]:
    if timestamp is None:
        return None

    regular_timestamp = timestamp / 1000

    return datetime.datetime.fromtimestamp(regular_timestamp).strftime(
        "%Y-%m-%dT%H:%M:%S.%fZ"
    )


if __name__ == "__main__":
    uuid = "3ff2e63ad63045e0b96f57cd0eae708d"
    # uuid = "8e70666aa2d144ec914d5172b7dcb289"
    # uuid = "2c8b76a5fded4a8980b2f3ded61456e7" # aarcanist
    # uuid = "e533388b2ebc4bb1a6705ba522d4e5d6"
    hypixel_api_key = os.getenv("hypixel_api_key")
    # print(calculate_bedwars_level(315820))
    # data = get_core_hypixel_data(uuid)
    data = get_guild_data(uuid)
    print(data)
