# Flow Sample

Flow Sample is a freeform research playground where creativity and data drift together just to see what surfaces. Every folder captures an idea midstream — some polished, others shimmering as sketches — but all of them celebrate the art of letting information flow without forcing it into tidy containers.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  UI (Svelte 5 + Vite + Tailwind)     → http://localhost:5173 │
│       ↓                                                      │
│  Server (Hono)                        → http://localhost:4173 │
│       ↓                                                      │
│  Backend (Hexagonal Architecture)                            │
│       ├── FlowEngine (orchestrator)                          │
│       ├── SpotifyAdapter (Spotify API)                       │
│       └── FileSystemAdapter (JSON storage)                   │
└─────────────────────────────────────────────────────────────┘
```

For detailed documentation, see [`docs/architecture/`](docs/architecture/README.md).

## Quick Start

```bash
# 1. Install dependencies
npm install
cd ui && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc.

# 3. Run (development)
npm run server          # Backend API on :4173
cd ui && npm run dev    # UI on :5173 (proxies to :4173)

# 3b. Run (production)
cd ui && npm run build  # Build UI
npm run server          # Serves everything on :4173
```

## Repository Structure

| Directory | Description |
|-----------|-------------|
| `ui/` | Svelte 5 frontend with Tailwind CSS |
| `src/server/` | Hono HTTP server |
| `src/spotify-flow/` | Core business logic (Hexagonal Architecture) |
| `outputs/` | Generated data files |
| `docs/` | Documentation |
| `docs/architecture/` | Technical architecture docs |

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Server** | `npm run server` | Start backend (port 4173) |
| **CLI** | `npm start` | Run Spotify flow via CLI |
| **CLI (limit)** | `npm start -- --limit 50` | Limit tracks fetched |
| **Tests** | `npm test` | Run Vitest |
| **Typecheck** | `npm run typecheck` | TypeScript check |

### UI Scripts (run from `ui/` directory)

| Script | Command | Description |
|--------|---------|-------------|
| **Dev** | `npm run dev` | Vite dev server (port 5173) |
| **Build** | `npm run build` | Production build |
| **Lint** | `npm run lint` | ESLint check |
| **Format** | `npm run format` | Prettier format |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
```

See [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow) for obtaining credentials.

## Documentation

- [Architecture Overview](docs/architecture/README.md)
- [UI Architecture](docs/architecture/ui.md)
- [Server Architecture](docs/architecture/server.md)
- [Backend Architecture](docs/architecture/backend.md)
- [Project History](HISTORY.md)

## Flows

Currently implemented:

- **Spotify Liked Songs**: Fetch, enrich, and visualize your saved tracks

Future plans:

- YouTube Music
- Apple Music
- More visualization options

## License

CC BY-SA 4.0 — See LICENSE for details.
