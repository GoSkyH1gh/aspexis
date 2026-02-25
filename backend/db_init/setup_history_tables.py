import asyncio
import os
from sqlalchemy import text
from db import engine

async def setup_history_tables():
    async with engine.begin() as conn:
        print("Creating player_username_history table...")
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS player_username_history (
                    uuid UUID NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        )
        
        await conn.execute(
            text(
                """
                -- Create an index to quickly find the latest username for a given UUID
                CREATE INDEX IF NOT EXISTS idx_player_username_history_uuid_last_seen
                ON player_username_history (uuid, last_seen_at DESC);
                """
            )
        )
        
        print("Creating player_skin_history table...")
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS player_skin_history (
                    uuid UUID NOT NULL,
                    skin_hash VARCHAR(255) NOT NULL,
                    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (uuid, skin_hash)
                );
                """
            )
        )
        
        print("Creating player_cape_history table...")
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS player_cape_history (
                    uuid UUID NOT NULL,
                    cape_hash VARCHAR(255) NOT NULL,
                    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (uuid, cape_hash)
                );
                """
            )
        )
        
        print("History tables created successfully.")

if __name__ == "__main__":
    # Check if database URL is set before trying to run
    if not os.getenv("DATABASE_URL"):
        # We need to load dotenv if we run this script directly
        from dotenv import load_dotenv
        load_dotenv()
        
    asyncio.run(setup_history_tables())
