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


class ContentProgress(BaseModel):
    total: int
    list: dict[str, int]


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


class WynncraftCharacterSkillPoints(BaseModel):
    strength: int
    dexterity: int
    inteligence: int
    defense: int
    agility: int


class WynncraftCharacterStats(BaseModel):
    mobs_killed: Optional[int]
    chests_opened: Optional[int]
    blocks_walked: Optional[int]
    logins: int
    deaths: int


class WynncraftCharacterContent(BaseModel):
    content_completed: int
    quests_completed: int
    discoveries: int
    caves: int
    lootruns: int
    world_events: int
    wars: int
    dungeons: ContentProgress
    raids: ContentProgress


class WynncraftCharacterInfo(BaseModel):
    character_uuid: str
    character_class: str
    nickname: Optional[str]
    reskin: Optional[str]
    level: int
    playtime: float
    gamemodes: list[str]
    professions: ProfessionInfo
    skill_points: Optional[WynncraftCharacterSkillPoints]
    content: WynncraftCharacterContent
    stats: WynncraftCharacterStats


class WynncraftPlayerStats(BaseModel):
    wars: int
    mobs_killed: int
    chests_opened: int
    dungeons_completed: int
    raids_completed: int
    playtime_hours: float


class WynncraftPlayerSummary(BaseModel):
    username: str
    uuid: str
    online: bool
    rank: str
    rank_badge: Optional[str]
    first_login: Optional[str]
    last_login: Optional[str]
    guild_name: Optional[str]
    guild_prefix: Optional[str]
    player_stats: Optional[WynncraftPlayerStats]
    characters: list[WynncraftCharacterInfo]
    restrictions: PlayerRestrictions


# guild info


class WynncraftGuildMember(BaseModel):
    username: str
    uuid: str
    online: bool
    joined: str
    rank: str


class WynncraftGuildInfo(BaseModel):
    name: str
    prefix: str
    guild_uuid: str
    level: int
    wars: int
    territories: int
    created: str
    member_count: int
    members: list[WynncraftGuildMember]


class GetWynncraftData:
    def __init__(self):
        pass

    def _process_characters(
        self, characters: dict[str, dict], restrictions: PlayerRestrictions
    ) -> list[WynncraftCharacterInfo]:
        pydantic_characters = []
        for character in characters:
            selected_character: dict = characters.get(character, {})
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
                    profession_args[profession] = selected_character["professions"][
                        profession
                    ]["level"]
                except Exception:
                    profession_args[profession] = 0

            character_professions = ProfessionInfo(**profession_args)

            if restrictions.character_build_access:
                skill_points = None
            else:
                wynn_skill_points = selected_character.get("skillPoints", {})
                skill_points = WynncraftCharacterSkillPoints(
                    strength=wynn_skill_points.get("strength") or 0,
                    dexterity=wynn_skill_points.get("dexterity") or 0,
                    inteligence=wynn_skill_points.get("intelligence") or 0,
                    defense=wynn_skill_points.get("defense") or 0,
                    agility=wynn_skill_points.get("agility") or 0,
                )

            character_stats = WynncraftCharacterStats(
                mobs_killed=selected_character.get("mobsKilled"),
                chests_opened=selected_character.get("chestsFound"),
                blocks_walked=selected_character.get("blocksWalked"),
                deaths=selected_character.get("deaths") or 0,
                logins=selected_character.get("logins") or 0,
            )

            raids = ContentProgress(
                list=selected_character.get("raids", {}).get("list", []),
                total=selected_character.get("raids", {}).get("total") or 0,
            )

            dungeons = ContentProgress(
                list=selected_character.get("dungeons", {}).get("list", []),
                total=selected_character.get("dungeons", {}).get("total") or 0,
            )

            character_content = WynncraftCharacterContent(
                content_completed=selected_character.get("contentCompletion") or 0,
                quests_completed=len(selected_character.get("quests", [])),
                discoveries=selected_character.get("discoveries") or 0,
                caves=selected_character.get("caves") or 0,
                wars=selected_character.get("wars") or 0,
                world_events=selected_character.get("worldEvents") or 0,
                lootruns=selected_character.get("lootruns") or 0,
                raids=raids,
                dungeons=dungeons,
            )

            modeled_character = WynncraftCharacterInfo(
                character_uuid=character,
                character_class=selected_character.get("type", "").title(),
                nickname=selected_character.get("nickname"),
                reskin=selected_character.get("reskin"),
                level=selected_character.get("level") or 0,
                playtime=selected_character.get("playtime") or 0,
                gamemodes=selected_character.get("gamemode") or [],
                professions=character_professions,
                skill_points=skill_points,
                content=character_content,
                stats=character_stats,
            )

            pydantic_characters.append(modeled_character)
        return pydantic_characters

    def get_player_data(self, uuid) -> WynncraftPlayerSummary:
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
                main_access=restrictions_response.get("mainAccess", True),
                character_data_access=restrictions_response.get(
                    "characterDataAccess", True
                ),
                character_build_access=restrictions_response.get(
                    "characterBuildAccess", True
                ),
                online_status=restrictions_response.get("onlineStatus", True),
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

            characters: dict = wynn_response.get("characters", [])
            if characters is None:  # if access is restricted, this is none
                characters = {}

            pydantic_characters = self._process_characters(characters, restrictions)

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
                player_stats = WynncraftPlayerStats(
                    wars=wynn_response["globalData"]["wars"],
                    mobs_killed=wynn_response["globalData"]["mobsKilled"],
                    chests_opened=wynn_response["globalData"]["chestsFound"],
                    dungeons_completed=wynn_response["globalData"]["dungeons"]["total"],
                    raids_completed=wynn_response["globalData"]["raids"]["total"],
                    playtime_hours=wynn_response["playtime"],
                )

            player_summary = WynncraftPlayerSummary(
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

    def get_guild_data(self, guild_prefix: str) -> WynncraftGuildInfo:
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
                    WynncraftGuildMember(
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

        guild_info = WynncraftGuildInfo(
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
            "https://api.wynncraft.com/v3/map/quests",
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


def add_wynncraft_stats_to_db(data: WynncraftPlayerSummary) -> None:
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
