# Flow Sample

A playground for data flows — extract, transform, and visualize data from various sources.

## ✨ Features

- **Spotify Flow**: Sync your saved tracks, explore genres, decades, and discover patterns
- **Lyrics Flow**: Batch-fetch lyrics from LrcLib with concurrent requests, view inline
- **Trading Bot Flow**: Real-time BTC advisor with Fractal Analysis and AI-driven "Cascade Wizard"
- **Chat Flow**: Multi-provider LLM chat (Gemini, Groq, Cerebras, Mistral, OpenRouter) with rotation fallback and SSE streaming
- **Cosmic UI**: Dark space-themed interface with glassmorphism and subtle animations
- **Charts & Insights**: Genre distribution, decade analysis, and more
- **Smart Caching**: 5-minute API cache with auto-invalidation

## Architecture

```text
flow-sample/
├── packages/
│   ├── core/               # Logger, shared infra (@flows/core)
│   ├── shared/             # TypeScript types & interfaces (@flows/shared)
│   ├── backend/            # Elysia API server (@flows/backend)
│   ├── ui/                 # Svelte 5 Frontend (@flows/ui)
│   └── flows/
│       ├── spotify/        # Spotify API adapter + SQLite (@flows/spotify)
│       ├── lyrics/         # LrcLib adapter + batch fetcher (@flows/lyrics)
│       ├── trading/        # Binance WebSocket + AI advisor (@flows/trading)
│       └── chat/           # Multi-provider LLM chat + SSE (@flows/chat)
├── data/                   # SQLite databases
├── docs/                   # Documentation
└── package.json            # pnpm workspace root
```

## Quick Start

```bash
# 1. Install dependencies (requires pnpm)
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc.

# 3. Development
pnpm dev                # Runs backend (:4173) and UI (:5173) in parallel
```

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Dev** | `pnpm dev` | Start Backend + UI in parallel |
| **Build** | `pnpm run build` | Build all packages |
| **Type Check** | `pnpm run typecheck` | TypeScript checking |
| **Test** | `pnpm run test` | Run unit tests |
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

## License

CC BY-SA 4.0
