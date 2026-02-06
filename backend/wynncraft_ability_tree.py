import httpx
from pydantic import BaseModel
import asyncio
from utils import dashify_uuid
from dotenv import load_dotenv
import os
from typing import Literal
import exceptions

load_dotenv()

wynn_token = os.getenv("WYNN_TOKEN")

if not wynn_token:
    raise RuntimeError("Wynncraft Token not set in environment variables.")


VALID_CLASSES = {"warrior", "mage", "archer", "assassin", "shaman"}

BASE_CDN_URL = "https://cdn.wynncraft.com/nextgen/abilities/2.1"


class AbilityTreeNode(BaseModel):
    node_type: Literal["ability", "connector"]
    name: str
    pretty_name: str | None  # has html
    description: str | None  # has html
    connector_type: (
        Literal[
            "connector_down_left",
            "connector_right_down",
            "connector_right_down_left",
            "connector_right_left",
            "connector_up_down",
            "connector_up_down_left",
            "connector_up_right_down",
            "connector_up_right_down_left",
            "connector_up_right_left",
        ]
        | None
    )
    x: int
    y: int
    unlocked: bool

    icon_id: str
    icon_url: str


class AbilityTreePage(BaseModel):
    page_number: int
    nodes: list[AbilityTreeNode]


def get_icon_url(
    node_type: Literal["ability", "connector"], icon_id: str, unlocked: bool
) -> str:
    unlocked_suffix = ""
    if unlocked:
        unlocked_suffix = "_active"

    if node_type == "ability":
        return f"{BASE_CDN_URL}/nodes/{icon_id}{unlocked_suffix}.png"
    elif node_type == "connector":
        return f"{BASE_CDN_URL}/connectors/grid/{icon_id}{unlocked_suffix}.png"


async def get_ability_tree(
    uuid: str, character_uuid: str, class_type: str, http_client: httpx.AsyncClient
):
    if class_type not in VALID_CLASSES:
        raise exceptions.UnprocessableEntity("invalid wynncraft class")
    structure_task = get_tree_structure(class_type, http_client)
    abilities_task = get_tree_abilities(class_type, http_client)
    player_task = get_player_structure(uuid, character_uuid, http_client)

    structure_pages, abilities_pages, player_pages = await asyncio.gather(
        structure_task, abilities_task, player_task
    )

    # Build lookup: (page_number, node_name) -> AbilityTreeNode (with descriptions)
    ability_descriptions = {}
    for page in abilities_pages:
        for node in page.nodes:
            ability_descriptions[(page.page_number, node.name)] = node

    # Build set of unlocked nodes (abilities AND connectors)
    unlocked_keys = set()
    for page in player_pages:
        for node in page.nodes:
            unlocked_keys.add((page.page_number, node.name))

    # Merge everything into the structure
    merged_pages: list[AbilityTreePage] = []

    for page in structure_pages:
        merged_nodes: list[AbilityTreeNode] = []

        for node in page.nodes:
            key = (page.page_number, node.name)

            # Add descriptions for abilities
            if node.node_type == "ability":
                if key in ability_descriptions:
                    desc_node = ability_descriptions[key]
                    node.pretty_name = desc_node.pretty_name
                    node.description = desc_node.description

            # Check unlock status for both abilities and connectors
            node.unlocked = key in unlocked_keys
            node.icon_url = get_icon_url(
                node.node_type, node.icon_id, node.unlocked
            )

            merged_nodes.append(node)

        merged_pages.append(
            AbilityTreePage(page_number=page.page_number, nodes=merged_nodes)
        )

    return merged_pages


async def get_tree_structure(
    class_type: str, http_client: httpx.AsyncClient
) -> list[AbilityTreePage]:
    tree_response = await http_client.get(
        f"https://api.wynncraft.com/v3/ability/map/{class_type}",
        headers={"Authorization": f"Bearer {wynn_token}"},
    )

    try:
        tree_response.raise_for_status()
    except httpx.TimeoutException:
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError:
        raise exceptions.UpstreamError()

    raw_data: dict[str, list[dict]] = tree_response.json()

    pages_nodes: dict[int, list[AbilityTreeNode]] = {}

    for page_str, items in raw_data.items():
        page_num = int(page_str)

        pages_nodes[page_num] = []

        for item in items:
            node_type = item.get("type")
            coords = item.get("coordinates", {})
            meta = item.get("meta", {})

            if node_type == "ability":
                name = meta.get("id", "")
                connector_type = None
                icon_id = meta["icon"]["value"]["name"]

            elif node_type == "connector":
                name = meta.get("icon", "")
                connector_type = meta.get("icon")
                icon_id = meta.get("icon")

            else:
                continue

            pages_nodes[page_num].append(
                AbilityTreeNode(
                    node_type=node_type,
                    name=name,
                    pretty_name=None,
                    description=None,
                    connector_type=connector_type,
                    x=coords.get("x", 0),
                    y=coords.get("y", 0),
                    unlocked=False,
                    icon_id=icon_id,
                    icon_url=get_icon_url(node_type, icon_id, False),
                )
            )

    return [
        AbilityTreePage(page_number=page_num, nodes=nodes)
        for page_num, nodes in sorted(pages_nodes.items())
    ]


async def get_player_structure(
    uuid: str, character_uuid: str, http_client: httpx.AsyncClient
):
    # this is similar to get_tree_structure
    # but it only includes abilities which are unlocked by the player
    player_response = await http_client.get(
        f"https://api.wynncraft.com/v3/player/{dashify_uuid(uuid)}/characters/{character_uuid}/abilities",
        headers={"Authorization": f"Bearer {wynn_token}"},
    )
    if player_response.status_code == 403:
        raise exceptions.Forbidden(
            "The player has disabled public access to their ability tree."
        )
    try:
        player_response.raise_for_status()
    except httpx.TimeoutException:
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError:
        raise exceptions.UpstreamError()

    raw_data: list[dict] = player_response.json()

    pages_nodes: dict[int, list[AbilityTreeNode]] = {}

    for item in raw_data:
        meta = item.get("meta", {})
        page_num = meta.get("page", 1)

        if page_num not in pages_nodes:
            pages_nodes[page_num] = []

        node_type = item.get("type")
        coords = item.get("coordinates", {})

        if node_type == "ability":
            name = meta.get("id", "")
            connector_type = None
            icon_id = meta["icon"]["value"]["name"]
        elif node_type == "connector":
            name = meta.get("icon", "")
            connector_type = meta.get("icon")
            icon_id = meta.get("icon")
        else:
            continue

        node = AbilityTreeNode(
            node_type=node_type,
            name=name,
            pretty_name=None,
            description=None,
            x=coords.get("x", 0),
            y=coords.get("y", 0),
            connector_type=connector_type,
            unlocked=True,  # All items from this endpoint are unlocked
            icon_id=icon_id,
            icon_url=get_icon_url(node_type, icon_id, True),
        )

        pages_nodes[page_num].append(node)

    # Convert to sorted list of AbilityTreePage
    processed_pages: list[AbilityTreePage] = []
    for page_num in sorted(pages_nodes.keys()):
        processed_pages.append(
            AbilityTreePage(page_number=page_num, nodes=pages_nodes[page_num])
        )

    return processed_pages


async def get_tree_abilities(
    class_type: str, http_client: httpx.AsyncClient
) -> list[AbilityTreePage]:
    # only abilities, but contains rich descriptions
    tree_response = await http_client.get(
        f"https://api.wynncraft.com/v3/ability/tree/{class_type}",
        headers={"Authorization": f"Bearer {wynn_token}"},
    )
    try:
        tree_response.raise_for_status()
    except httpx.TimeoutException:
        raise exceptions.UpstreamTimeoutError()
    except httpx.RequestError:
        raise exceptions.UpstreamError()

    tree_data: dict = tree_response.json()

    processed_pages: list[AbilityTreePage] = []
    raw_pages: dict = tree_data.get("pages", {})
    for page_number, page in raw_pages.items():
        processed_nodes: list[AbilityTreeNode] = []
        for node in page:
            node_info = page[node]
            icon_id = node_info["icon"]["value"]["name"]
            processed_nodes.append(
                AbilityTreeNode(
                    node_type="ability",
                    name=node,
                    pretty_name=node_info["name"],
                    description=str.join("", node_info["description"]),
                    x=node_info["coordinates"]["x"],
                    y=node_info["coordinates"]["y"],
                    connector_type=None,
                    unlocked=False,
                    icon_id=icon_id,
                    icon_url=get_icon_url("ability", icon_id, False),
                )
            )
        tree_page = AbilityTreePage(page_number=page_number, nodes=processed_nodes)
        processed_pages.append(tree_page)

    return processed_pages


if __name__ == "__main__":
    data = asyncio.run(
        get_ability_tree(
            "3ff2e63ad63045e0b96f57cd0eae708d",
            "b44f68d8-e73a-437b-acda-ee938282932f",
            "warrior",
            httpx.AsyncClient(),
        )
    )
    print(data)