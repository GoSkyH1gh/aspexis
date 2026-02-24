# db.py
import os
import re
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

if db_url is None:
    raise RuntimeError("Database URL is not set in environment variables")


db_url = db_url.split("?")[0]
db_url = re.sub(r"^postgresql\+psycopg2:", "postgresql+asyncpg:", db_url)
db_url = re.sub(r"^postgresql:", "postgresql+asyncpg:", db_url)

engine = create_async_engine(
    db_url,
    connect_args={"ssl": "require"},
    echo=False,
    pool_pre_ping=True,
    pool_size=15,  # persistent connections
    max_overflow=15,  # temporary burst connections
    pool_timeout=30,  # seconds to wait before error
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


# Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
