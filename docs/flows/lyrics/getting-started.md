# Lyrics Flow

Lyrics enriches tracks from the neutral Music store with LrcLib lyrics, optional LLM
interpretation, and a token-level musical Canvas. It is mounted in the shared backend
host and available in the UI at `/lyrics`.

## Boundaries And Prerequisites

`@flows/lyrics` depends on `@flows/music`, not on `@flows/spotify`. The current product
workflow normally starts by connecting and syncing Spotify because Spotify is the only
track ingestion adapter today, but another producer can populate the same neutral Music
store without changing Lyrics.

- Track, artist, genre, and FTS persistence belongs to `@flows/music` in `music.db`.
- Lyrics records, fetch status, and interpretations belong to `@flows/lyrics` and use the
  injected Music database handle.
- Generic tokenization and analysis persistence belong to `@flows/analysis` in
  `canvas.db`.
- Lyrics owns the LrcLib adapter, musical section classification, prompts, route mapping,
  and flow UI.

LrcLib needs no API key. Interpretation and Canvas analysis require at least one LLM
provider key configured as described in [LLM API keys](../llm/api-keys.md).

## Runtime Flow

1. The library loader requests tracks and Lyrics statistics through a request-scoped Eden
   client.
2. `LyricsService` checks the injected repository before querying LrcLib.
3. The LrcLib adapter searches with title, artist, album, and duration, then the repository
   stores `found` or deliberate `not_found` state.
4. Interpretation streams validated typed events and caches the completed text.
5. Lyrics Canvas tokenizes the stored source, classifies musical sections, validates LLM
   annotations against source token IDs, and persists the analysis.

Provider failures are sanitized at the HTTP boundary; raw provider responses stay in
server logs. A missing lyric or analysis is represented explicitly and is not treated as
an unexpected server error.

## API

| Method | Path                                  | Purpose                                                           |
| ------ | ------------------------------------- | ----------------------------------------------------------------- |
| `GET`  | `/api/lyrics/tracks`                  | Paginated library with optional lyrics-status filter              |
| `GET`  | `/api/lyrics/stats`                   | Library coverage statistics                                       |
| `GET`  | `/api/lyrics/:trackId`                | Return cached/fetched lyrics; `force=true` retries the provider   |
| `POST` | `/api/lyrics/fetch-all`               | Fetch pending tracks; `retryFailed` also retries prior misses     |
| `POST` | `/api/lyrics/:trackId/interpret`      | Stream cached or generated interpretation events over SSE         |
| `GET`  | `/api/lyrics/:trackId/canvas`         | Return analysis, analysis-required state, or a typed source error |
| `POST` | `/api/lyrics/:trackId/canvas/analyze` | Generate and persist a musical Canvas analysis                    |

Normal JSON calls use Eden and TypeBox response schemas. Interpretation is the one raw
Lyrics transport because it is SSE; the UI validates every event against the shared
`LyricsInterpretationEvent` contract.

## Development

```bash
pnpm dev
pnpm --filter @flows/lyrics test
pnpm --filter @flows/lyrics test:coverage
pnpm --filter @flows/ui test src/lib/flows/lyrics src/routes/lyrics/page.test.ts
pnpm --filter @flows/ui test:e2e -- e2e/lyrics-canvas.spec.ts
```

See [Canvas and Lyrics architecture](../lyrics-canvas/architecture.md) for token,
annotation, persistence, and package ownership details.
