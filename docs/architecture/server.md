# Server Architecture

## Tech Stack

| Technology | Purpose |
| ---------- | ------- |
| **Elysia** | HTTP composition, validation, plugin system |
| **@elysiajs/node** | Node.js adapter |
| **@elysiajs/static** | Static UI serving in production |
| **Eden Treaty** | Type-safe client contract for the SvelteKit UI |
| **better-sqlite3** | Local SQLite persistence inside owned repositories |

## Host Shape

The backend package is a thin host. Flow packages own their domain logic,
repositories, adapters, and routes; `@flows/board` owns named-board application state;
`@flows/backend` only composes them.

```text
packages/backend/src/api/
├── app.ts      # import-safe createApp(config)
├── config.ts   # env-to-config mapping
└── server.ts   # process entrypoint, dotenv, listen()
```

`app.ts` must stay import-safe because UI Eden types and backend tests import it.
Only `server.ts` may bind a port.

## Mounted Routes

| Prefix | Owner |
| ------ | ----- |
| `/api/health` | backend host |
| `/api/spotify` | `@flows/spotify` |
| `/api/lyrics` | `@flows/lyrics` |
| `/api/trading` | `@flows/trading` |
| `/api/chat` | `@flows/chat` |
| `/api/canvas` | `@flows/canvas` |
| `/api/boards` | `@flows/board` |

In production-style builds, the host also serves the SvelteKit static output from
`packages/ui/build` when it exists, with `index.html` fallback for SPA routing.

## Code Overview

```typescript
const app = createApp(config)
  .use(createSpotifyRoutes(config))
  .use(createLyricsRoutes())
  .use(createTradingRoutes())
  .use(chatRoutes)
  .use(canvasFlowRoutes)
  .use(createBoardRoutes());
```

## Running

```bash
pnpm --filter @flows/backend dev
```

The root `pnpm dev` script runs all package dev scripts in parallel.
