# Flow Sample

A playground for data flows — extract, transform, and visualize data from various sources.

## Current Architecture

```
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
# Copy example to backend package (where it's needed)
cp .env.example packages/backend/.env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc. in packages/backend/.env

# 3. Development
pnpm dev                # Runs backend (:4173) and UI (:5173) in parallel
```

## Project Structure

```
flow-sample/
├── packages/
│   ├── backend/        # API, Infrastructure, Domain (@flows/backend)
│   ├── ui/             # Svelte 5 Frontend (@flows/ui)
│   └── shared/         # Shared Types/Interfaces (@flows/shared)
├── data/               # SQLite database
├── docs/               # Documentation
└── package.json        # Root Workspace configuration
```

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Dev** | `pnpm dev` | Start Backend + UI in parallel |
| **Backend** | `pnpm --filter @flows/backend run dev` | Start only Backend |
| **UI** | `pnpm --filter @flows/ui run dev` | Start only UI |
| **Build Shared**| `pnpm build:shared` | Build shared types (required for TS) |
| **Check** | `pnpm -r run check` | Run type checking in all packages |
| **Lint** | `pnpm -r run lint` | Run ESLint in all packages |

## Tech Stack

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| **UI**         | Svelte 5, Vite 7, Tailwind CSS 4 |
| **Server**     | Elysia (with Node.js adapter)    |
| **Database**   | SQLite (better-sqlite3)          |
| **Validation** | Zod, TypeBox                     |
| **Testing**    | Vitest                           |

## Documentation

- [Architecture Overview](docs/architecture/README.md)
- [Server Architecture](docs/architecture/server.md)
- [Backend Architecture](docs/architecture/backend.md)
- [UI Architecture](docs/architecture/ui.md)
- [Project History](HISTORY.md)

## License

CC BY-SA 4.0
