# @flows/lyrics

Lyrics integration flow — fetches lyrics from [LRCLIB](https://lrclib.net) and stores them in SQLite.

## Architecture

```text
adapter/    → LrcLib API client with concurrent batch fetcher
repository  → SQLite storage (lyrics status tracking)
lyrics.service.ts          → individual and batch orchestration
interpretation.service.ts  → typed LLM stream and persistence
routes                     → HTTP/SSE mapping (/api/lyrics/*)
```

## Key Features

- Single track lyrics fetch by title + artist + album + duration
- **Concurrent batch fetching** — 10 parallel requests (configurable), with progress logging every 5%
- Status tracking: `pending` → `found` / `not_found`
- Retry support for individual tracks and bulk retry of failed ones
- Plain and synced (timestamped) lyrics support

## API Routes

| Method | Path                                  | Description                          |
| :----- | :------------------------------------ | :----------------------------------- |
| GET    | `/api/lyrics/:trackId`                | Get lyrics for a track               |
| POST   | `/api/lyrics/fetch-all`               | Batch fetch pending lyrics           |
| GET    | `/api/lyrics/tracks`                  | Track list with lyrics status        |
| GET    | `/api/lyrics/stats`                   | Lyrics coverage stats                |
| POST   | `/api/lyrics/:trackId/interpret`      | Cached or streamed AI interpretation |
| GET    | `/api/lyrics/:trackId/canvas`         | Lyrics Canvas state                  |
| POST   | `/api/lyrics/:trackId/canvas/analyze` | Generate Lyrics Canvas analysis      |

`POST /fetch-all` accepts `{ "retryFailed": true }` to include prior
`not_found` records. HTTP responses are schema-backed for Eden; interpretation SSE uses
the shared `LyricsInterpretationEvent` union and sends sanitized provider failures.

Run `pnpm --filter @flows/lyrics test:coverage` for repository, adapter, service, route,
Canvas, and SSE coverage.
