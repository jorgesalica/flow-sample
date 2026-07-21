# Flow Sample

A local-first playground for composing data and AI flows around music, text analysis,
chat, and trading experiments. The repository is a pnpm monorepo: each flow is an
independently testable bounded module hosted by one Elysia API and one SvelteKit UI.

## Flows

- **Spotify** syncs saved tracks and explores genres, decades, and listening patterns.
- **Lyrics** fetches and stores lyrics from LrcLib.
- **Trading** streams Binance market data and provides AI-assisted fractal analysis.
- **Chat** exposes multi-provider LLM chat with rotation fallback and SSE streaming.
- **Canvas** tokenizes text and renders typed LLM annotations.

The home experience is an accessible board where flows can be reordered, collapsed, and
resized with a versioned local layout while their dedicated routes remain available.
Every registered flow publishes a typed card contract for its live summary, optional
expanded metrics, and loading/empty/error/stale states; the board renders that contract
without importing flow internals.

The UI shares one semantic design system across all routes, with persistent galaxy,
fire, and organic themes and responsive desktop/mobile workspaces.

## Architecture

```text
packages/
  core/             cross-cutting runtime infrastructure (@flows/core)
  music/            neutral shared music persistence (@flows/music)
  shared/           client/server DTOs and constants (@flows/shared)
  backend/          Elysia application host (@flows/backend)
  ui/               SvelteKit and Svelte 5 frontend (@flows/ui)
  flows/
    spotify/        Spotify adapter and music persistence
    lyrics/         lyrics adapter, services, and persistence
    trading/        market stream, domain analysis, and advisor
    chat/           LLM chat and SSE routes
    canvas/         tokenizer and annotation canvas
data/               local SQLite databases
docs/               current guidance, history, and proposals
```

Flows are bounded workspace modules, not separately deployed applications. They share
the application host and communicate across the client/server boundary through typed
Eden Treaty RPC. See the [system map](docs/architecture/system-map.md) for ownership and
extraction rules.

## Quick Start

Requirements: Node.js 20.19 or newer and pnpm 10.24.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The backend runs on `http://localhost:4173`; the Vite UI runs on
`http://localhost:5173` and proxies `/api` and `/outputs` to the backend.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run every flow, backend, and UI with hot reload |
| `pnpm build` | Build all workspace packages |
| `pnpm verify` | Run docs/architecture checks, lint, types, Svelte check, and tests |
| `pnpm test:coverage` | Run every coverage-bearing package and print a deterministic aggregate |
| `pnpm --filter @flows/ui test:e2e` | Run Playwright journeys |
| `pnpm format` | Format packages that provide a formatter |

## Configuration

Copy `.env.example` to `.env`. Spotify requires `SPOTIFY_CLIENT_ID` and
`SPOTIFY_CLIENT_SECRET`. AI features require at least one supported provider key such as
`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, or
`MISTRAL_API_KEY`. Runtime selection uses `LLM_PROVIDER`; `LLM_MODEL` is an optional
direct-provider override and is deliberately ignored by rotation mode, which uses each
provider's current default model.
Trading defaults can be changed with `TRADING_SYMBOL` and `TRADING_INTERVAL`.

Environment values are parsed only by named configuration factories and passed into
runtime composition. Never commit `.env` or credentials.

## Stack

| Layer | Technology |
| --- | --- |
| UI | SvelteKit, Svelte 5 runes, Vite 7, Tailwind CSS 4, Chart.js |
| API | ElysiaJS on Node.js, TypeBox validation |
| Data | better-sqlite3 |
| Typed RPC | Eden Treaty |
| Tests | Vitest, Testing Library, Playwright, Node test runner |
| Logging | Pino |

## Documentation

Start at the [documentation index](docs/README.md). The principal sources of truth are:

- [Conventions](docs/conventions.md): engineering and delivery rules.
- [Roadmap](docs/ROADMAP.md): product direction and execution order.
- [System map](docs/architecture/system-map.md): package boundaries.
- [Testing strategy](docs/testing/README.md): required test layers and gates.
- [Design system](docs/design-system.md): shared UI primitives and tokens.
- [AGENTS.md](AGENTS.md): concise operating instructions for coding agents.

## Delivery

Work happens on short-lived branches through PRs to `main`; there is no `develop`
branch or deployment pipeline. Before pushing non-trivial work, run:

```bash
pnpm verify
pnpm build
```

CI performs a clean install, full build, static/tooling checks, and ratcheted package
coverage on every PR and push to `main`. UI behavior changes also require focused
Playwright coverage or a documented manual desktop/mobile verification.

## License

CC BY-SA 4.0
