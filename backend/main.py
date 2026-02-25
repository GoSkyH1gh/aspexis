from fastapi import FastAPI, BackgroundTasks, Request, Depends, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from wynncraft_api import (
    get_wynncraft_player_data,
    get_wynncraft_guild_data,
    WynncraftPlayerSummary,
    WynncraftGuildInfo,
    add_wynncraft_stats_to_db,
)
from online_status import get_status, PlayerStatus
from dotenv import load_dotenv
from minecraft_api import MojangData
from donut_api import get_donut_stats, DonutPlayerStats, add_donut_stats_to_db
from mcci_api import MCCIPlayer, get_mcci_data
from metrics_manager import get_stats, HistogramData
from db import get_db

from exceptions import ErrorResponse
from player_tracker import subscribe, unsubscribe
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from hypixel_manager import (
    get_hypixel_data,
    HypixelFullData,
    HypixelGuildMemberFull,
    get_full_guild_members,
    HypixelGuildMemberParams,
    add_hypixel_stats_to_db,
)
from minecraft_manager import get_minecraft_data, update_player_history
from typing import List, Annotated, Literal, Any
import time
from telemetry_manager import add_telemetry_event
from capes import get_capes_for_user, UserCapeData
from wynncraft_ability_tree import get_ability_tree, AbilityTreePage

from slowapi.util import get_remote_address
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware

from contextlib import asynccontextmanager
import httpx
from utils import normalize_uuid
from redis_manager import get_redis
from redis.asyncio import Redis

load_dotenv()

COMMON_ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    422: {"model": ErrorResponse, "description": "Unprocessable Entity"},
    429: {"model": ErrorResponse, "description": "Too Many Requests"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
    502: {"model": ErrorResponse, "description": "Upstream Error"},
    504: {"model": ErrorResponse, "description": "Upstream Timeout"},
}

# client management

client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global client
    client = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=5.0),
    )
    yield
    # Shutdown
    await client.aclose()


async def get_client():
    return client


app = FastAPI(
    title="Aspexis API",
    description="API for Minecraft-related player statistics. \
        Rate limits: 180/m, 1000/10m, 10,000/d per IP.",
    version="1.0.0",
    contact={
        "name": "Aspexis",
        "url": "https://aspexis.netlify.app",
    },
    license_info={
        "name": "MIT",
    },
    lifespan=lifespan,
)


# limiter


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=get_client_ip,
    strategy="moving-window",
    application_limits=["1000/10 minutes", "10000/day"],
    default_limits=["180/minute"],
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

origins = [
    "https://aspexis.netlify.app",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    if request.url.path == "/healthz":
        # Just process the request and return, DON'T touch the DB
        return await call_next(request)
    start = time.time()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception:
        # Call_next didn't complete — still record telemetry
        raise
    finally:
        latency_ms = int((time.time() - start) * 1000)
        asyncio.create_task(
            add_telemetry_event(
                request.url.path,
                request.url.path.split("/")[-1],
                latency_ms,
                status_code,
            )
        )


@app.get(
    "/",
    tags=["General"],
    name="Root",
    description="Returns a simple greeting message from the Aspexis API.",
)
def root():
    response = {"message": "hi, this is the Aspexis API"}
    return response


@app.get(
    "/healthz",
    tags=["General"],
    name="Health Check",
    description="Basic endpoint to check if the API is up and running.",
)
@limiter.exempt
def health_check():
    return {"status": "ok"}


@app.get(
    "/v1/players/mojang/{identifier}",
    responses=COMMON_ERROR_RESPONSES,
    tags=["Minecraft"],
    response_model=MojangData,
    name="Get Mojang Profile",
    description="Fetches Minecraft profile data (UUID, name, skin) from Mojang servers.\
         The identifier can be a username or uuid.",
)
@limiter.limit("40/minute")
async def get_profile(
    request: Request,
    identifier,
    background_tasks: BackgroundTasks,
    allow_stale: bool = False,
    http_client: httpx.AsyncClient = Depends(get_client),
    redis: Redis = Depends(get_redis),
    session: AsyncSession = Depends(get_db),
) -> MojangData:
    data = await get_minecraft_data(
        identifier, http_client, redis, allow_stale=allow_stale
    )
    if data.source != "cache":
        background_tasks.add_task(update_player_history, data, session)
    return data


@app.get(
    "/v1/players/capes/{uuid}",
    tags=["Minecraft"],
    response_model=List[UserCapeData],
    responses=COMMON_ERROR_RESPONSES,
    name="Get Player Capes",
    description="Retrieves all available capes for a specific Minecraft player UUID from various providers.",
)
async def get_capes(
    uuid: str,
    http_client: httpx.AsyncClient = Depends(get_client),
    redis: Redis = Depends(get_redis),
) -> List[UserCapeData]:
    uuid = normalize_uuid(uuid)
    return await get_capes_for_user(uuid, http_client, redis)


@app.get(
    "/v1/players/hypixel/{uuid}",
    responses=COMMON_ERROR_RESPONSES,
    tags=["Hypixel"],
    response_model=HypixelFullData,
    name="Get Hypixel Stats",
    description="Fetches comprehensive Hypixel player statistics and overall progress.",
)
@limiter.limit("60/minute")
async def get_hypixel(
    request: Request,
    uuid: str,
    background_tasks: BackgroundTasks,
    http_client: httpx.AsyncClient = Depends(get_client),
    redis: Redis = Depends(get_redis),
) -> HypixelFullData:
    uuid = normalize_uuid(uuid)
    data = await get_hypixel_data(uuid, http_client, redis)
    background_tasks.add_task(add_hypixel_stats_to_db, data)
    return data


@app.get(
    "/v1/hypixel/guilds/{id}",
    tags=["Hypixel"],
    responses=COMMON_ERROR_RESPONSES,
    response_model=List[HypixelGuildMemberFull],
    name="Get Hypixel Guild Members",
    description="Retrieves a list of members for a specific Hypixel guild with pagination.",
)
async def get_guild(
    id,
    query_params: Annotated[HypixelGuildMemberParams, Query()],
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_client),
    redis: Redis = Depends(get_redis),
) -> List[HypixelGuildMemberFull]:
    return await get_full_guild_members(
        id,
        session,
        query_params.limit,
        http_client,
        redis,
        query_params.offset,
        background_tasks,
    )


@app.get(
    "/v1/players/status/{uuid}",
    tags=["Minecraft"],
    response_model=PlayerStatus,
    responses=COMMON_ERROR_RESPONSES,
    name="Get Player Online Status",
    description="Checks if a player is currently online on supported Minecraft servers.",
)
async def get_player_status(uuid: str) -> PlayerStatus:
    uuid = normalize_uuid(uuid)
    return await get_status(uuid)


# wynncraft endpoints


@app.get(
    "/v1/players/wynncraft/{uuid}",
    responses=COMMON_ERROR_RESPONSES,
    tags=["Wynncraft"],
    response_model=WynncraftPlayerSummary,
    name="Get Wynncraft Stats",
    description="Fetches detailed Wynncraft player statistics and account summary.",
)
async def get_wynncraft(
    uuid: str,
    background_tasks: BackgroundTasks,
    http_client: httpx.AsyncClient = Depends(get_client),
) -> WynncraftPlayerSummary:
    uuid = normalize_uuid(uuid)
    player_data = await get_wynncraft_player_data(uuid, http_client)
    background_tasks.add_task(add_wynncraft_stats_to_db, player_data)
    return player_data


@app.get(
    "/v1/wynncraft/guilds/{prefix}",
    tags=["Wynncraft"],
    responses=COMMON_ERROR_RESPONSES,
    response_model=WynncraftGuildInfo,
    name="Get Wynncraft Guild Data",
    description="Retrieves detailed information about a Wynncraft guild using its prefix.",
)
async def get_wynncraft_guild(
    prefix,
    http_client: httpx.AsyncClient = Depends(get_client),
) -> WynncraftGuildInfo:
    return await get_wynncraft_guild_data(prefix, http_client)


ClassType = Literal[
    "warrior",
    "mage",
    "archer",
    "assassin",
    "shaman",
]


@app.get(
    "/v1/players/wynncraft/{uuid}/characters/{character_uuid}/ability-tree",
    responses=COMMON_ERROR_RESPONSES,
    tags=["Wynncraft"],
    response_model=List[AbilityTreePage],
    name="Get Wynncraft Character Ability Tree",
    description="Fetches the ability tree configuration for a specific Wynncraft character.",
)
async def get_wynncraft_character_ability_tree(
    uuid: str,
    character_uuid: str,
    class_type: ClassType = Query(..., alias="class"),
    http_client: httpx.AsyncClient = Depends(get_client),
    redis: Redis = Depends(get_redis),
) -> list[AbilityTreePage]:
    uuid = normalize_uuid(uuid)
    return await get_ability_tree(
        uuid=uuid,
        character_uuid=character_uuid,
        class_type=class_type,
        http_client=http_client,
        redis=redis,
    )


# donutsmp endpoint
@app.get(
    "/v1/players/donutsmp/{username}",
    tags=["DonutSMP"],
    response_model=DonutPlayerStats,
    responses=COMMON_ERROR_RESPONSES,
    name="Get DonutSMP Stats",
    description="Retrieves player statistics for the DonutSMP server.",
)
async def get_donut(
    username: str,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_client),
    redis: Redis = Depends(get_redis),
) -> DonutPlayerStats:
    player_data = await get_donut_stats(username, http_client)
    background_tasks.add_task(
        add_donut_stats_to_db, player_data, username, session, http_client, redis
    )
    return player_data


# mcci endpoint
@app.get(
    "/v1/players/mccisland/{uuid}",
    tags=["MCCI"],
    responses=COMMON_ERROR_RESPONSES,
    response_model=MCCIPlayer,
    name="Get MCC Island Stats",
    description="Fetches player statistics and progress from the MCC Island server.",
)
async def get_mcc_island(
    uuid: str,
    http_client: httpx.AsyncClient = Depends(get_client),
) -> MCCIPlayer:
    uuid = normalize_uuid(uuid)
    return await get_mcci_data(uuid, http_client)


# metrics
@app.get(
    "/v1/metrics/{metric_key}/distribution/{player_uuid}",
    tags=["Metrics"],
    response_model=HistogramData,
    responses=COMMON_ERROR_RESPONSES,
    name="Get Metric Distribution",
    description="Retrieves statistical distribution data for a specific player metric.",
)
async def get_metric(metric_key: str, player_uuid: str) -> HistogramData:
    player_uuid = normalize_uuid(player_uuid)
    return await get_stats(metric_key, player_uuid)


# player tracker
@app.get(
    "/v1/tracker/{uuid}/status",
    tags=["Tracker"],
    name="Track Player Online Status",
    description="Establishes a real-time SSE connection to track a player's online status.",
)
async def track_player(uuid: str, request: Request):
    uuid = normalize_uuid(uuid)
    queue = await subscribe(uuid)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=25)
                    yield message
                except asyncio.TimeoutError:
                    yield "event: heartbeat\ndata: {}\n\n"
        finally:
            unsubscribe(uuid, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
