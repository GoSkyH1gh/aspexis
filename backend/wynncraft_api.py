import requests
from utils import dashify_uuid
from pydantic import BaseModel
from typing import Optional
from fastapi import HTTPException
from metrics_manager import add_value, get_engine
from dotenv import load_dotenv
import os
from exceptions import NotFound

# General notes
# * The wynncraft api requires dashed uuids so when calling something by UUID dashed_uuid should be used

load_dotenv()

wynn_token = os.getenv("WYNN_TOKEN")

if not wynn_token:
    raise RuntimeError("Wynncraft Token not set in environment variables.")


class PlayerRestrictions(BaseModel):
    main_access: bool
    character_data_access: bool
    character_build_access: bool
    online_status: bool


class ProfessionInfo(BaseModel):
    fishing: int
    woodcutting: int
    mining: int
    farming: int
    scribing: int
    jeweling: int
    alchemism: int
    cooking: int
    weaponsmithing: int
    tailoring: int
    woodworking: int
    armouring: int


class CharacterInfo(BaseModel):
    character_uuid: str
    character_class: str
    nickname: Optional[str]
    reskin: Optional[str]
    level: int
    playtime: float
    mobs_killed: Optional[int]
    chests_opened: Optional[int]
    logins: int
    deaths: int
    gamemodes: list[str]
    professions: ProfessionInfo
    quests_completed: int


class PlayerStats(BaseModel):
    wars: int
    mobs_killed: int
    chests_opened: int
    dungeons_completed: int
    raids_completed: int
    playtime_hours: float


class PlayerSummary(BaseModel):
    username: str
    uuid: str
    online: bool
    rank: str
    rank_badge: Optional[str]
    first_login: Optional[str]
    last_login: Optional[str]
    guild_name: Optional[str]
    guild_prefix: Optional[str]
    player_stats: Optional[PlayerStats]
    characters: list[CharacterInfo]
    restrictions: PlayerRestrictions


# guild info


class GuildMember(BaseModel):
    username: str
    uuid: str
    online: bool
    joined: str
    rank: str


class GuildInfo(BaseModel):
    name: str
    prefix: str
    guild_uuid: str
    level: int
    wars: int
    territories: int
    created: str
    member_count: int
    members: list[GuildMember]


class GetWynncraftData:
    def __init__(self):
        pass

    def get_player_data(self, uuid) -> PlayerSummary:
        """Gets basic data about the player"""
        dashed_uuid = dashify_uuid(uuid)
        raw_wynn_response = requests.get(
            f"https://api.wynncraft.com/v3/player/{dashed_uuid}?fullResult",
            headers={"Authorization": f"Bearer {wynn_token}"},
        )
        if raw_wynn_response.status_code == 404:
            raise NotFound()
        try:
            raw_wynn_response.raise_for_status()
            wynn_response: dict = raw_wynn_response.json()

            restrictions_response: dict = wynn_response.get("restrictions", {})
            restrictions = PlayerRestrictions(
                main_access=restrictions_response.get("mainAccess"),
                character_data_access=restrictions_response.get("characterDataAccess"),
                character_build_access=restrictions_response.get(
                    "characterBuildAccess", True
                ),
                online_status=restrictions_response.get("onlineStatus"),
            )

            if wynn_response["guild"] is not None:
                player_guild = wynn_response["guild"]["name"]
                guild_prefix = wynn_response["guild"]["prefix"]
            else:
                player_guild = None
                guild_prefix = None

            if wynn_response["rank"] != "Player":
                player_rank = wynn_response["rank"]
            else:
                if wynn_response["supportRank"] is not None:
                    player_rank = wynn_response["supportRank"]
                else:
                    player_rank = "Player"

            characters = wynn_response.get("characters", [])
            if characters is None:  # if access is restricted, this is none
                characters = []

            pydantic_characters = []
            for character in characters:
                # creating a ProfessionInfo pydantic instance
                profession_names = [
                    "fishing",
                    "woodcutting",
                    "mining",
                    "farming",
                    "scribing",
                    "jeweling",
                    "alchemism",
                    "cooking",
                    "weaponsmithing",
                    "tailoring",
                    "woodworking",
                    "armouring",
                ]

                profession_args = {}
                # accessing the level for each profession and creating a dict that looks like
                # {'fishing': '100', 'mining': 33, ...}
                for profession in profession_names:
                    try:
                        profession_args[profession] = characters[character][
                            "professions"
                        ][profession]["level"]
                    except Exception:
                        profession_args[profession] = 0

                character_professions = ProfessionInfo(**profession_args)

                if characters[character]["deaths"] is None:
                    deaths = 0
                else:
                    deaths = characters[character]["deaths"]

                modeled_character = CharacterInfo(
                    character_uuid=character,
                    character_class=characters[character]["type"].title(),
                    nickname=characters[character]["nickname"],
                    reskin=characters[character]["reskin"],
                    level=characters[character]["level"],
                    playtime=characters[character]["playtime"],
                    mobs_killed=characters[character]["mobsKilled"],
                    chests_opened=characters[character]["chestsFound"],
                    logins=characters[character]["logins"],
                    deaths=deaths,
                    gamemodes=characters[character]["gamemode"],
                    professions=character_professions,
                    quests_completed=len(characters[character]["quests"]),
                )

                pydantic_characters.append(modeled_character)

            if restrictions.online_status:
                first_login = None
                last_login = None
            else:
                if restrictions.main_access:  # if main access restrictions are on, firstJoin is innaccessible but lastJoin is fine
                    first_login = None
                else:
                    first_login = wynn_response["firstJoin"]
                last_login = wynn_response["lastJoin"]

            if restrictions.main_access:
                player_stats = None
            else:
                player_stats = PlayerStats(
                    wars=wynn_response["globalData"]["wars"],
                    mobs_killed=wynn_response["globalData"]["mobsKilled"],
                    chests_opened=wynn_response["globalData"]["chestsFound"],
                    dungeons_completed=wynn_response["globalData"]["dungeons"]["total"],
                    raids_completed=wynn_response["globalData"]["raids"]["total"],
                    playtime_hours=wynn_response["playtime"],
                )

            player_summary = PlayerSummary(
                username=wynn_response["username"],
                uuid=wynn_response["uuid"],
                online=wynn_response["online"],
                rank=player_rank,
                rank_badge=wynn_response["rankBadge"],
                first_login=first_login,
                last_login=last_login,
                characters=pydantic_characters,
                guild_name=player_guild,
                guild_prefix=guild_prefix,
                restrictions=restrictions,
                player_stats=player_stats,
            )

            return player_summary
        except Exception as e:
            print(
                f"Something went wrong while proccessing wynncaraft player {dashed_uuid}: {e}"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Wynncraft Player with UUID {dashed_uuid} could not be proccessed",
            )

    def get_guild_data(self, guild_prefix: str) -> GuildInfo:
        """Gets the guild response, player_guild is req"""
        raw_guild_response = requests.get(
            f"https://api.wynncraft.com/v3/guild/prefix/{guild_prefix}?identifier=username",
            headers={"Authorization": f"Bearer {wynn_token}"},
        )
        guild_response = raw_guild_response.json()

        guild_members = []
        for rank in guild_response["members"]:
            if rank == "total":
                continue

            for member in guild_response["members"][rank]:
                guild_members.append(
                    GuildMember(
                        username=member,
                        uuid=guild_response["members"][rank][member]["uuid"],
                        online=guild_response["members"][rank][member]["online"],
                        joined=guild_response["members"][rank][member]["joined"],
                        rank=rank,
                    )
                )

        if guild_response["wars"] is not None:
            wars = guild_response["wars"]
        else:
            wars = 0

        guild_info = GuildInfo(
            name=guild_response["name"],
            prefix=guild_response["prefix"],
            guild_uuid=guild_response["uuid"],
            level=guild_response["level"],
            wars=wars,
            created=guild_response["created"],
            territories=guild_response["territories"],
            member_count=guild_response["members"]["total"],
            members=guild_members,
        )

        return guild_info

    def _get_total_quests(self):
        """This is the total number of quests, which changes very rarely"""
        quests_response = requests.get(
            f"https://api.wynncraft.com/v3/map/quests",
            headers={"Authorization": f"Bearer {wynn_token}"},
        )
        quests_response = quests_response.json()
        print(quests_response)

    def get_guild_list(self):
        try:
            guilds_reponse = requests.get(
                "https://api.wynncraft.com/v3/guild/list/guild",
                headers={"Authorization": f"Bearer {wynn_token}"},
            )
            guilds_reponse.raise_for_status()

            return guilds_reponse.json()
        except Exception as e:
            print(f"Error fetching guild list: {e}")
            return []


def add_wynncraft_stats_to_db(data: PlayerSummary) -> None:
    if data.restrictions.main_access:
        return
    # this is a dictionary with the corresponding id in the database for the metric
    stats_to_add = {
        5: data.player_stats.chests_opened,
        10: data.player_stats.dungeons_completed,
        8: data.player_stats.mobs_killed,
        7: data.player_stats.wars,
        11: data.player_stats.raids_completed,
        6: data.player_stats.playtime_hours,
    }
    engine = get_engine()
    with engine.begin() as conn:
        for stat in stats_to_add:
            if stats_to_add.get(stat, None) is not None:
                add_value(conn, data.uuid, stat, stats_to_add[stat])


if __name__ == "__main__":
    uuid = "3ff2e63ad63045e0b96f57cd0eae708d"
    # uuid = "f3659880e6444485a6515d6f66e9360e"
    wynn_instance = GetWynncraftData()
    # wynn_instance.get_guild_list()
    print(wynn_instance.get_player_data(uuid))
    # wynn_instance.get_guild_data('Pirates of the Black Scourge')
