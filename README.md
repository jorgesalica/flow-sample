# Flow Sample

A playground for data flows — extract, transform, and visualize data from various sources.

## ✨ Features

- **Spotify Flow**: Sync your saved tracks, explore genres, decades, and discover patterns
- **Lyrics Flow**: Batch-fetch lyrics from LrcLib with concurrent requests, view inline
- **Trading Bot Flow**: Real-time BTC advisor with Fractal Analysis and AI-driven "Cascade Wizard"
- **Chat Flow**: Multi-provider LLM chat (Gemini, Groq, Cerebras, Mistral, OpenRouter) with rotation fallback and SSE streaming
- **Canvas Flow**: Tokenize lyrics/text and render LLM annotations (chords, vocal, meaning) on an interactive canvas
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
│   ├── ui/                 # SvelteKit frontend, Svelte 5 (@flows/ui)
│   └── flows/
│       ├── spotify/        # Spotify API adapter + SQLite (@flows/spotify)
│       ├── lyrics/         # LrcLib adapter + batch fetcher (@flows/lyrics)
│       ├── trading/        # Binance WebSocket + AI advisor (@flows/trading)
│       ├── chat/           # Multi-provider LLM chat + SSE (@flows/chat)
│       └── canvas/         # Tokenizer + LLM annotation canvas (@flows/canvas)
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
| **Type Check** | `pnpm run typecheck` | TypeScript checking across all packages |
| **Check** | `pnpm run check` | Svelte component type checking (UI) |
| **Test** | `pnpm run test` | Run unit tests (Vitest) |
| **Lint** | `pnpm run lint` | ESLint |
| **Format** | `pnpm run format` | Prettier auto-format |
| **Format Check** | `pnpm run format:check` | Verify formatting (used in CI/hooks) |
| **Clean** | `pnpm run clean` | Remove all `dist/` and `node_modules/` |

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | — | Server port (default `4173`) |
| `SPOTIFY_CLIENT_ID` | ✓ | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | ✓ | Spotify app client secret |
| `GEMINI_API_KEY` | ✓* | Gemini API key (`*` one LLM key required) |
| `GROQ_API_KEY` | — | Groq API key (for rotation mode) |
| `OPENROUTER_API_KEY` | — | OpenRouter API key |
| `CEREBRAS_API_KEY` | — | Cerebras API key |
| `MISTRAL_API_KEY` | — | Mistral API key |
| `LLM_PROVIDER` | — | `gemini` \| `groq` \| `rotation` … (default `gemini`) |
| `LLM_MODEL` | — | Model name for the selected provider |
| `TRADING_SYMBOL` | — | Default trading pair (default `BTCUSDT`) |
| `TRADING_INTERVAL` | — | Default candle interval (default `1m`) |

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **UI** | SvelteKit, Svelte 5 (runes), Vite 7, Tailwind CSS 4, Chart.js |
| **Server** | Elysia (Node.js adapter), `tsx` dev runtime |
| **Database** | SQLite (better-sqlite3) |
| **API client** | Eden Treaty (end-to-end typed) |
| **Validation** | TypeBox (Elysia `t`) |
| **Testing** | Vitest (+ coverage v8, Testing Library), Playwright |
| **Logging** | Pino |

## Documentation

- [Conventions & Best Practices](docs/conventions.md) — the engineering rules (start here)
- [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) — entry point for AI agents
- [System Map](docs/architecture/system-map.md) — package boundaries, flow contract, refactor lanes
- [Backend Architecture](docs/architecture/backend.md) — bounded-context flows, layers, LLM
- [UI Architecture](docs/architecture/ui.md) — SvelteKit, flows registry, Eden client
- [Architecture Roadmap](docs/refactor-proposals/future-architecture.md)
- [Design System](docs/design-system.md)
- [Future Tasks (Bucket)](docs/bucket.md)

## Quality gate

Personal project, minimal ceremony: short-lived branches open PRs directly to
`main`; there is no `develop` branch. Run the full local gate before pushing
anything non-trivial:

```bash
pnpm verify   # lint && typecheck && check && test
```

Coverage: `pnpm test:coverage`.

## License

CC BY-SA 4.0
