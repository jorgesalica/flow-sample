# Flow Sample

A playground for data flows — extract, transform, and visualize data from various sources.

## ✨ Features

- **Spotify Flow**: Sync your saved tracks, explore genres, decades, and discover patterns
- **Cosmic UI**: Dark space-themed interface with glassmorphism and subtle animations
- **Charts & Insights**: Genre distribution, decade analysis, and more
- **Smart Caching**: 5-minute API cache with auto-invalidation
- **Infinite Scroll**: Seamless browsing of your track library

## Current Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  @flows/ui (Svelte 5 + Charts)       → http://localhost:5173 │
│       ↓                                                      │
│  @flows/shared (Types)                                       │
│       ↑                                                      │
│  @flows/backend (Elysia)             → http://localhost:4173 │
│       └── Infrastructure (SQLite, Spotify API)               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Install dependencies (requires pnpm)
pnpm install

# 2. Configure environment
cp packages/backend/.env.example packages/backend/.env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc.

# 3. Development
pnpm dev                # Runs backend (:4173) and UI (:5173) in parallel
```

## Project Structure

```text
flow-sample/
├── packages/
│   ├── backend/        # API, Infrastructure, Domain (@flows/backend)
│   ├── ui/             # Svelte 5 Frontend (@flows/ui)
│   └── shared/         # Shared Types/Interfaces (@flows/shared)
├── data/               # SQLite database
├── docs/               # Documentation
│   ├── bucket.md       # Future tasks and ideas
│   ├── design-system.md
│   └── history/        # Changelogs
└── package.json        # Root Workspace
```

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Dev** | `pnpm dev` | Start Backend + UI in parallel |
| **Type Check** | `pnpm run typecheck` | TypeScript checking |
| **Test** | `pnpm run test` | Run unit tests |
| **E2E** | `pnpm --filter @flows/ui run test:e2e` | Playwright tests |
| **Lint** | `pnpm run lint` | ESLint |

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **UI** | Svelte 5, Vite 7, Tailwind CSS 4, Chart.js |
| **Server** | Elysia (with Node.js adapter) |
| **Database** | SQLite (better-sqlite3) |
| **Validation** | Zod, TypeBox |
| **Testing** | Vitest, Playwright |
| **Logging** | Pino |

## Documentation

- [Architecture Roadmap](docs/refactor-proposals/future-architecture.md)
- [Design System](docs/design-system.md)
- [Future Tasks (Bucket)](docs/bucket.md)
- [Backend History](docs/history/backend.md)
- [UI History](docs/history/ui.md)

## License

CC BY-SA 4.0
