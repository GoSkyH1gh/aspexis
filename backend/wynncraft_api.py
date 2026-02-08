import requests
from utils import dashify_uuid, undashify_uuid
from pydantic import BaseModel
from fastapi import HTTPException
from metrics_manager import add_value, get_engine
from dotenv import load_dotenv
import os
from exceptions import NotFound
import httpx
import asyncio

# General notes
# * The wynncraft api requires dashed uuids so when calling something by UUID dashed_uuid should be used

load_dotenv()

wynn_token = os.getenv("WYNN_TOKEN")

if not wynn_token:
    raise RuntimeError("Wynncraft Token not set in environment variables.")

PROFESSION_NAMES = [
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

STORYLINES = [
    {
        "name": "Recover the Past",
        "quests": [
            "King's Recruit",
            "Infested Plants",
            "Mushroom Man",
            "Taking the Tower",
            "Elemental Exercise",
            "Arachnids' Ascent",
            "Recover the Past",
        ],
    },
    {
        "name": "WynnExcavation",
        "quests": [
            "WynnExcavation Site A",
            "WynnExcavation Site B",
            "WynnExcavation Site C",
            "WynnExcavation Site D",
        ],
    },
    {
        "name": "An Iron Heart",
        "quests": ["An Iron Heart Part I", "An Iron Heart Part II"],
    },
    {
        "name": "Realm of Light",
        "quests": [
            "Realm of Light I - The Worm Holes",
            "Realm of Light II - Taproot",
            "Realm of Light III - A Headless History",
            "Realm of Light IV - Finding the Light",
            "Realm of Light V - The Realm of Light",
        ],
    },
    {
        "name": "Hunger of the Gerts",
        "quests": ["Hunger of the Gerts Part I", "Hunger of the Gerts Part II"],
    },
    {
        "name": "Aldorei's Secret",
        "quests": ["Aldorei's Secret Part I", "Aldorei's Secret Part II"],
    },
    {
        "name": "Corkus",
        "quests": [
            "The Envoy Part I",
            "The Envoy Part II",
            "The Feathers Fly Part I",
            "The Feathers Fly Part II",
            "The Breaking Point",
        ],
    },
    {
        "name": "Dwarves and Doguns",
        "quests": [
            "Dwarves and Doguns Part I",
            "Dwarves and Doguns Part II",
            "Dwarves and Doguns Part III",
            "Dwarves and Doguns Part IV",
        ],
    },
    {
        "name": "Silent Expanse",
        "quests": ["A Journey Beyond", "A Journey Further", "A Hunter's Calling"],
    },
]


class PlayerRestrictions(BaseModel):
    main_access: bool
    character_data_access: bool
    character_build_access: bool
    online_status: bool


class ContentProgress(BaseModel):
    total: int | None
    list: dict[str, int]


class StorylineQuest(BaseModel):
    name: str
    completed: bool


class Storyline(BaseModel):
    name: str
    quests_completed: int
    quests_available: int
    quests: list[StorylineQuest]


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
    intelligence: int
    defense: int
    agility: int


class WynncraftCharacterStats(BaseModel):
    mobs_killed: int | None
    chests_opened: int | None
    blocks_walked: int | None
    logins: int | None
    deaths: int | None


class WynncraftCharacterContent(BaseModel):
    content_completed: int | None
    quests_completed: int | None
    discoveries: int | None
    caves: int | None
    lootruns: int | None
    world_events: int | None
    wars: int | None
    dungeons: ContentProgress
    raids: ContentProgress
    storylines: list[Storyline] | None


class WynncraftCharacterInfo(BaseModel):
    character_uuid: str
    character_class: str
    nickname: str | None
    reskin: str | None
    level: int
    playtime: float | None
    gamemodes: list[str]
    professions: ProfessionInfo | None
    skill_points: WynncraftCharacterSkillPoints | None
    content: WynncraftCharacterContent
    stats: WynncraftCharacterStats
    removed_stats: list[str]


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
    rank_badge: str | None
    first_login: str | None
    last_login: str | None
    guild_name: str | None
    guild_prefix: str | None
    player_stats: WynncraftPlayerStats | None
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


def get_character_stat(
    stat: str, selected_character: dict, removed_stats: list[str]
) -> int | None:
    if stat in removed_stats:
        return None
    return selected_character.get(stat) or 0


def get_character_professions(selected_character: dict) -> ProfessionInfo:
    profession_args = {}
    # accessing the level for each profession and creating a dict that looks like
    # {'fishing': '100', 'mining': 33, ...}
    for profession in PROFESSION_NAMES:
        try:
            profession_args[profession] = selected_character["professions"][profession][
                "level"
            ]
        except Exception:
            profession_args[profession] = 0

    return ProfessionInfo(**profession_args)


def get_storylines(player_quests: list[str]) -> list[Storyline]:
    storylines: list[Storyline] = []
    for storyline in STORYLINES:
        storyline_quests_list: list[StorylineQuest] = []
        for quest in storyline["quests"]:
            storyline_quests_list.append(
                StorylineQuest(name=quest, completed=quest in player_quests)
            )

        storyline_quests_completed = 0
        for quest in storyline_quests_list:
            if quest.completed:
                storyline_quests_completed += 1

        storylines.append(
            Storyline(
                name=storyline["name"],
                quests_completed=storyline_quests_completed,
                quests_available=len(storyline_quests_list),
                quests=storyline_quests_list,
            )
        )
    return storylines


def process_characters(
    characters: dict[str, dict],
    restrictions: PlayerRestrictions,
) -> list[WynncraftCharacterInfo]:
    pydantic_characters = []
    for character in characters:
        selected_character: dict = characters.get(character, {})
        removed_stats = selected_character.get("removedStat", [])

        if "professions" in removed_stats:
            character_professions = None
        else:
            character_professions = get_character_professions(selected_character)

        if restrictions.character_build_access or "skillPoints" in removed_stats:
            skill_points = None
        else:
            wynn_skill_points = selected_character.get("skillPoints", {})
            skill_points = WynncraftCharacterSkillPoints(
                strength=wynn_skill_points.get("strength") or 0,
                dexterity=wynn_skill_points.get("dexterity") or 0,
                intelligence=wynn_skill_points.get("intelligence") or 0,
                defense=wynn_skill_points.get("defense") or 0,
                agility=wynn_skill_points.get("agility") or 0,
            )

        character_stats = WynncraftCharacterStats(
            mobs_killed=get_character_stat(
                "mobsKilled", selected_character, removed_stats
            ),
            chests_opened=get_character_stat(
                "chestsFound", selected_character, removed_stats
            ),
            blocks_walked=get_character_stat(
                "blocksWalked", selected_character, removed_stats
            ),
            deaths=get_character_stat("deaths", selected_character, removed_stats),
            logins=get_character_stat("logins", selected_character, removed_stats),
        )

        if "raids" in removed_stats:
            raids = ContentProgress(total=None, list={})
        else:
            raids = ContentProgress(
                list=selected_character.get("raids", {}).get("list", {}),
                total=selected_character.get("raids", {}).get("total") or 0,
            )

        if "dungeons" in removed_stats:
            dungeons = ContentProgress(total=None, list={})
        else:
            dungeons = ContentProgress(
                list=selected_character.get("dungeons", {}).get("list", {}),
                total=selected_character.get("dungeons", {}).get("total") or 0,
            )

        quests_completed = (
            None
            if "quests" in removed_stats
            else len(selected_character.get("quests", []))
        )

        if "quests" in removed_stats:
            player_quests = None
        else:
            player_quests = selected_character.get("quests", [])

        storylines: list[Storyline] | None = None
        if player_quests is not None:
            storylines = get_storylines(player_quests)

        character_content = WynncraftCharacterContent(
            content_completed=get_character_stat(
                "contentCompletion", selected_character, removed_stats
            ),
            quests_completed=quests_completed,
            discoveries=get_character_stat(
                "discoveries", selected_character, removed_stats
            ),
            caves=get_character_stat("caves", selected_character, removed_stats),
            wars=get_character_stat("wars", selected_character, removed_stats),
            world_events=get_character_stat(
                "worldEvents", selected_character, removed_stats
            ),
            lootruns=get_character_stat("lootruns", selected_character, removed_stats),
            raids=raids,
            dungeons=dungeons,
            storylines=storylines,
        )

        # we're doing playtime separately because it has different logic

        playtime = (
            None
            if "playtime" in removed_stats
            else float(selected_character.get("playtime", 0))
        )

        modeled_character = WynncraftCharacterInfo(
            character_uuid=character,
            character_class=selected_character.get("type", "").title(),
            nickname=selected_character.get("nickname"),
            reskin=selected_character.get("reskin"),
            level=selected_character.get("level") or 0,
            playtime=playtime,
            gamemodes=selected_character.get("gamemode") or [],
            professions=character_professions,
            skill_points=skill_points,
            content=character_content,
            stats=character_stats,
            removed_stats=removed_stats,
        )

        pydantic_characters.append(modeled_character)
    return pydantic_characters


async def get_wynncraft_player_data(
    uuid: str, http_client: httpx.AsyncClient
) -> WynncraftPlayerSummary:
    """Gets basic data about the player"""
    dashed_uuid = dashify_uuid(uuid)

    raw_wynn_response = await http_client.get(
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

        pydantic_characters = process_characters(characters, restrictions)

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


async def get_wynncraft_guild_data(
    guild_prefix: str, http_client: httpx.AsyncClient
) -> WynncraftGuildInfo:
    """Gets the guild response, player_guild is req"""
    raw_guild_response = await http_client.get(
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
                    uuid=undashify_uuid(
                        guild_response["members"][rank][member]["uuid"]
                    ),
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


def get_total_quests():
    """This is the total number of quests, which changes very rarely"""
    quests_response = requests.get(
        "https://api.wynncraft.com/v3/map/quests",
        headers={"Authorization": f"Bearer {wynn_token}"},
    )
    quests_response = quests_response.json()
    print(quests_response)


def get_guild_list():
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
    if data.restrictions.main_access or not data.player_stats:
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
    # wynn_instance.get_guild_list()
    data = asyncio.run(get_wynncraft_player_data(uuid, httpx.AsyncClient()))
    print(data)
    # wynn_instance.get_guild_data('Pirates of the Black Scourge')
