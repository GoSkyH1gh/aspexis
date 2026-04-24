# Aspexis

Player stats, one search. Aspexis pulls Hypixel, Wynncraft, MCC Island, DonutSMP, and Mojang data into a single fast profile.

Try it here: **https://aspexis.netlify.app/**

![Aspexis preview](assets/aspexis-hero-v2.gif)


## Features

- Search any player by username or UUID
- View Hypixel stats with Bedwars mode splits and full guild data
- Explore Wynncraft characters, completion progress, and an interactive ability tree
- See percentile rankings alongside raw stats
- Track player online/offline status in real time
- Favorite players for quick access later

## Stats and percentiles

Raw numbers don't mean much without context. When a player is looked up, their stats are recorded, building a pool of real player data over time. This powers distribution curves and percentile rankings, so instead of just seeing a raw score you can see how it compares to everyone else.

<table style="border: none;">
  <tr>
    <td><img src="assets/readme-v2-player-stats.png" width="500" alt="Percentile chart"></td>
    <td><img src="assets/readme-v2-stats-leaderboard.png" width="500" alt="Stat Leaderboard"></td>
  </tr>
</table>


## Wynncraft integration

Wynncraft support goes deeper than a stat summary. Each player profile includes character listings with class icons, level data, and completion progress across quests, dungeons, and discoveries, calculated against live game-wide maximums so percentages are always accurate.

The standout feature is a fully interactive ability tree, browsable with hover tooltips, rich ability descriptions, and one-click PNG export.

![Wynncraft ability tree](assets/aspexis-atree-v2.gif)


## Tech stack

### Frontend

[![React](https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-1f2937?style=for-the-badge&logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-111827?style=for-the-badge&logo=vite&logoColor=646cff)](https://vite.dev)

### Backend

[![FastAPI](https://img.shields.io/badge/FastAPI-0f172a?style=for-the-badge&logo=fastapi&logoColor=009688)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-1e293b?style=for-the-badge&logo=postgresql&logoColor=4169e1)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-1f2937?style=for-the-badge&logo=redis&logoColor=ff4438)](https://redis.io)


## Architecture

Aspexis uses a React/Vite frontend with a FastAPI backend. Redis handles caching and rate limiting. PostgreSQL stores player data accumulated from lookups, which powers the percentile and distribution features.

Provider failures are isolated, if one service is down or rate-limited, the rest of the profile still loads.

```text
React + Vite frontend
        │
        ▼
FastAPI backend
        │
        ├── Redis cache / rate limits
        ├── PostgreSQL player data / metrics
        │
        └── Mojang, Hypixel, Wynncraft, MCC Island, DonutSMP, capes.me
```

Want to run your own instance? See [self-hosting guide](self-hosting.md).

## License

MIT