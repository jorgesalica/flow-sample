# Flow Sample

A playground for data flows — extract, transform, and visualize data from various sources.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  UI (Svelte 5 + Vite + Tailwind)     → http://localhost:5173 │
│       ↓                                                      │
│  Server (Elysia)                      → http://localhost:4173 │
│       ↓                                                      │
│  Backend (Layered Architecture)                              │
│       ├── API → Application → Domain                         │
│       └── Infrastructure (SQLite, Spotify API)               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Install dependencies
npm install
cd ui && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc.

# 3. Run
npm run server          # Backend API on :4173
cd ui && npm run dev    # UI on :5173
```

## Project Structure

```
flow-sample/
├── ui/                         # Frontend (Svelte 5)
├── src/
│   ├── api/                    # HTTP Layer (Elysia)
│   ├── application/            # Use Cases
│   ├── domain/                 # Entities, Ports
│   ├── infrastructure/         # Adapters, SQLite, Repositories
│   └── cli/                    # CLI entry point
├── data/                       # SQLite database
├── tests/                      # Vitest tests
└── docs/                       # Documentation
```

## Available Scripts

| Script        | Command             | Description                      |
| ------------- | ------------------- | -------------------------------- |
| **Server**    | `npm run server`    | Start Elysia backend (port 4173) |
| **CLI**       | `npm start`         | Run Spotify flow via CLI         |
| **Tests**     | `npm test`          | Run Vitest                       |
| **Typecheck** | `npm run typecheck` | TypeScript check                 |
| **Lint**      | `npm run lint`      | ESLint check                     |

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
