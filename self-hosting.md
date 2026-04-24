# Self-Hosting Aspexis

Aspexis has a React/Vite frontend and a FastAPI backend. You'll need four API keys, a PostgreSQL database, and a Redis instance before anything will run.

---

## Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org)
- [pnpm](https://pnpm.io/installation)
- [Python](https://www.python.org)
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- A PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))
- A Redis instance (local for dev, or hosted e.g. [Upstash](https://upstash.com))

> **Note:** Redis behavior depends on your `ENV` setting.
> In `development`, the backend connects to a local Redis instance at `localhost:6379` — no URL needed, but Redis must be running before the backend starts.
> In `production`, it uses the `REDIS_URL` from your `.env`. The backend will throw an error on startup if the connection fails either way.

---

## 1. Get your API keys

You need keys from four providers:

**Hypixel**
1. Log into [developer.hypixel.net](https://developer.hypixel.net)
2. Create an application and copy your API key

**Wynncraft**
1. Go to [wynncraft.com](https://wynncraft.com) and create an account
2. Navigate to Profile > Developers > Add Token

**DonutSMP**
1. Login to the DonutSMP server at donutsmp.net
2. Run the `/api` command in-game

**MCC Island**
1. Visit [gateway.noxcrew.com](https://gateway.noxcrew.com/) and create an account
2. Go to the Developers section and create a new key

---

## 2. Set up your services

**PostgreSQL** — Any hosted Postgres works. [Neon](https://neon.tech) has a free tier that's easy to set up. Once created, copy the connection string — it looks like:

```
postgresql://user:password@host/dbname?sslmode=require
```

**Redis** — For production, [Upstash](https://upstash.com) has a free tier with TLS support. Once created, copy the `rediss://` connection string (note the double `s` — this is TLS). For development, just make sure a local Redis instance is running on `localhost:6379`.

---

## 3. Configure environment variables

Inside the `/backend` directory, create a `.env` file:

```dotenv
# API Keys
hypixel_api_key   = "your-hypixel-key"
donut_api_key     = "your-donut-key"
mcci_api_key      = "your-mcci-key"
WYNN_TOKEN        = "your-wynncraft-token"

# Database
DATABASE_URL      = "postgresql://user:password@host/dbname?sslmode=require"

# Redis
# development: connects to localhost:6379 automatically (no URL needed)
# production: required — must be set
REDIS_URL         = "rediss://default:password@host:port"

# Environment
ENV               = "development"
```

> Set `ENV="production"` when deploying publicly.

---

## 4. Install dependencies

**Frontend** (from the repo root):

```bash
pnpm install
```

**Backend** (from `/backend`):

```bash
uv sync
```

---

## 5. Run the app

You can start both servers individually or together.

### Together (Windows)

A `start_all.bat` is included in the repo root. Double-click it or run:

```bat
start_all.bat
```

This launches both the frontend dev server and the FastAPI backend simultaneously.

### Individually

**Backend** — from the `/backend` directory:

```bash
uv run fastapi dev
```

The API will be available at `http://localhost:8000`.

**Frontend** — from the repo root:

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

---

## Troubleshooting

**Backend won't start (development)**
→ Make sure a local Redis instance is running on `localhost:6379`. Aspexis does not manage Redis for you — start it separately before launching the backend.

**Backend won't start (production)**
→ Check that `REDIS_URL` is set in your `.env` and the hosted instance is reachable.

**`DATABASE_URL` errors**
→ Make sure your Postgres instance is running and the connection string includes the correct SSL params (`?sslmode=require` for Neon).
