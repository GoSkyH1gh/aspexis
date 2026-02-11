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

import exceptions
from player_tracker import subscribe, unsubscribe
import asyncio
from sqlalchemy.orm import Session
from hypixel_manager import (
    get_hypixel_data,
    HypixelFullData,
    HypixelGuildMemberFull,
    get_full_guild_members,
    HypixelGuildMemberParams,
    add_hypixel_stats_to_db,
)
from minecraft_manager import get_minecraft_data
from typing import List, Annotated, Literal
import time
from telemetry_manager import add_telemetry_event
from capes import get_capes_for_user, UserCapeData
from wynncraft_ability_tree import get_ability_tree, AbilityTreePage

from slowapi.util import get_remote_address
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware

from contextlib import asynccontextmanager
import httpx

load_dotenv()

# client management

client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global client
    client = httpx.AsyncClient()
    yield
    # Shutdown
    await client.aclose()


async def get_client():
    return client


app = FastAPI(lifespan=lifespan)


# limiter


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=get_client_ip,
    strategy="moving-window",
    application_limits=["600/10 minutes", "2000/hour", "10000/day"],
    default_limits=["100/minute"],
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


@app.get("/")
def root():
    response = {"message": "hi, this is the Aspexis API"}
    return response


@app.get("/healthz")
@limiter.exempt
def health_check():
    return {"status": "ok"}


@app.get(
    "/v1/players/mojang/{username}",
    responses={
        400: {"model": exceptions.ErrorResponse, "description": "Bad Request"},
        404: {"model": exceptions.ErrorResponse, "description": "Not Found"},
        500: {
            "model": exceptions.ErrorResponse,
            "description": "Internal Server Error",
        },
        502: {"model": exceptions.ErrorResponse, "description": "Upstream Error"},
        504: {
            "model": exceptions.ErrorResponse,
            "description": "Upstream Timeout Error",
        },
    },
)
async def get_profile(
    username,
    session: Session = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_client),
) -> MojangData:
    return await get_minecraft_data(username, session, http_client)


@app.get("/v1/players/capes/{uuid}")
async def get_capes(
    uuid: str,
    http_client: httpx.AsyncClient = Depends(get_client),
) -> List[UserCapeData]:
    return await get_capes_for_user(uuid, http_client)


@app.get(
    "/v1/players/hypixel/{uuid}",
    responses={
        400: {"model": exceptions.ErrorResponse, "description": "Bad Request"},
        404: {"model": exceptions.ErrorResponse, "description": "Not Found"},
        500: {
            "model": exceptions.ErrorResponse,
            "description": "Internal Server Error",
        },
        502: {"model": exceptions.ErrorResponse, "description": "Upstream Error"},
        504: {
            "model": exceptions.ErrorResponse,
            "description": "Upstream Timeout Error",
        },
    },
)
def get_hypixel(
    uuid, background_tasks: BackgroundTasks, session: Session = Depends(get_db)
) -> HypixelFullData:
    data = get_hypixel_data(uuid, session)
    background_tasks.add_task(add_hypixel_stats_to_db, data)
    return data


@app.get("/v1/hypixel/guilds/{id}")
def get_guild(
    id,
    query_params: Annotated[HypixelGuildMemberParams, Query()],
    session: Session = Depends(get_db),
) -> List[HypixelGuildMemberFull]:
    return get_full_guild_members(id, session, query_params.limit, query_params.offset)


@app.get("/v1/players/status/{uuid}")
async def get_player_status(uuid) -> PlayerStatus:
    return await get_status(uuid)


# wynncraft endpoints


@app.get(
    "/v1/players/wynncraft/{uuid}",
    responses={404: {"model": exceptions.ErrorResponse, "description": "Not found"}},
)
async def get_wynncraft(
    uuid: str,
    background_tasks: BackgroundTasks,
    http_client: httpx.AsyncClient = Depends(get_client),
) -> WynncraftPlayerSummary:
    player_data = await get_wynncraft_player_data(uuid, http_client)
    background_tasks.add_task(add_wynncraft_stats_to_db, player_data)
    return player_data


@app.get("/v1/wynncraft/guilds/{prefix}")
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
    responses={
        403: {
            "model": exceptions.ErrorResponse,
            "description": "Ability tree is private",
        },
        422: {
            "model": exceptions.ErrorResponse,
            "description": "Invalid class",
        },
    },
)
async def get_wynncraft_character_ability_tree(
    uuid: str,
    character_uuid: str,
    class_type: ClassType = Query(..., alias="class"),
    http_client: httpx.AsyncClient = Depends(get_client),
) -> list[AbilityTreePage]:
    return await get_ability_tree(
        uuid=uuid,
        character_uuid=character_uuid,
        class_type=class_type,
        http_client=http_client,
    )


# donutsmp endpoint
@app.get("/v1/players/donutsmp/{username}")
async def get_donut(
    username,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db),
    http_client: httpx.AsyncClient = Depends(get_client),
) -> DonutPlayerStats:
    player_data = await get_donut_stats(username, http_client)
    background_tasks.add_task(
        add_donut_stats_to_db, player_data, username, session, http_client
    )
    return player_data


# mcci endpoint
@app.get("/v1/players/mccisland/{uuid}")
async def get_mcc_island(
    uuid: str,
    http_client: httpx.AsyncClient = Depends(get_client),
) -> MCCIPlayer:
    return await get_mcci_data(uuid, http_client)


# metrics
@app.get("/v1/metrics/{metric_key}/distribution/{player_uuid}")
def get_metric(metric_key: str, player_uuid: str) -> HistogramData:
    return get_stats(metric_key, player_uuid)


# player tracker
@app.get("/v1/tracker/{uuid}/status")
async def track_player(uuid: str, request: Request):
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
