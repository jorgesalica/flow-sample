# Backend History

Changelog for the backend (API, persistence, domain logic).

---

## 2026-07-21 - Spotify and Lyrics application boundaries

Issue #71 made both music integrations explicit at the HTTP/application boundary:

- Added injectable Spotify orchestration for OAuth, sync, cache invalidation, search,
  lookup, and aggregate reads; missing tracks now return `404`, with deliberate auth,
  rate-limit, and provider statuses.
- Extracted Lyrics individual/batch fetching and interpretation streaming into services;
  the existing `retryFailed` UI request is now honored by backend orchestration.
- Added shared DTOs and TypeBox response schemas so Spotify/Lyrics Eden consumers no
  longer use unsafe double casts.
- Sanitized Lyrics interpretation setup and in-band SSE failures while preserving raw
  provider details in server logs, and added runtime stream-event validation in the UI.
- Added service, route, SSE, and UI API tests and included the HTTP routers in package
  coverage.

---

## 2026-07-21 - Chat runtime boundaries and stable stream errors

Issue #70 made Chat import-safe and explicit at every runtime boundary:

- Replaced eager database/service/router singletons with `createChatDatabase()` and
  `createChatRoutes()` factories plus an injectable `ChatApplication` contract.
- Added stable `404` conversation absence, `400` domain validation, sanitized `503`
  provider failures, and sanitized in-band SSE error events.
- Moved SSE serialization into the route; the service now yields shared discriminated
  event DTOs.
- Added response schemas so Eden consumers no longer cast Chat payloads, plus runtime SSE
  validation in the UI facade.
- Added import-safety, in-memory SQLite, route/SSE, service, and UI API coverage; Chat now
  participates in root `test:coverage`.

---

## 2026-07-21 - Canvas domain boundary and annotation integrity

Issue #69 closed the remaining generic Canvas boundary leaks:

- Core tokenization now produces numbered generic sections; Lyrics owns music-section
  classification while preserving token IDs and legacy section behavior.
- Generic Canvas and Lyrics share prompt-safe AST formatting that omits structural IDs.
- Both analyzers discard generated annotation references absent from the source AST.
- Generic Canvas orchestration moved from eager routes into an injectable service and
  repository port; routes are factory-created and map provider failures to sanitized
  `503` responses.
- Added Core, Lyrics-domain, analyzer, service, and `.handle()` route coverage.

---

## 2026-07-16 - Lyrics Canvas QA and LLM rotation repair

Issue #66 repaired Canvas generation and made the provider boundary auditable:

- Rotation now ignores the direct-mode `LLM_MODEL` override and initializes Groq,
  OpenRouter, Cerebras, and Mistral with their own catalog defaults.
- OpenRouter now defaults to the dynamic `openrouter/free` router; retired Cerebras model
  IDs were replaced by `gpt-oss-120b` and `zai-glm-4.7`.
- Structured output can return the actual provider/model response metadata, which Lyrics
  Canvas and generic Canvas persist instead of hard-coded Gemini values.
- Canvas completions use a 4096-token output budget compatible with free-provider quotas.
- Missing analysis is a successful domain state; unavailable AI providers map to a
  sanitized `503` while detailed failures remain in backend logs.
- Added rotation, metadata, service, analyzer, and `app.handle()` route coverage.

---

## 2025-12-09 — Lyrics Flow (Backend)

### Infrastructure

- **Schema**: Added `lyrics` table with `plain_lyrics`, `synced_lyrics`, `status` (pending/found/not_found), and `fetched_at`.
- **Adapter**: `LrcLibAdapter` for fetching lyrics from `lrclib.net` (no auth required).
- **Repository**: `SQLiteLyricsRepository` with helper to fetching pending track IDs.

### API & Logic

- **Cache-First Strategy**: `GET /api/lyrics/:trackId` strictly returns cached data if found.
- **Force Fetch**: Added `?force=true` param to bypass cache and re-fetch from LrcLib.
- **Batch Processing**: `POST /api/lyrics/fetch-all` endpoint to process only pending tracks.
- **CORS**: Enabled `@elysiajs/cors` to allow cross-origin requests from frontend.

---

## 2025-12-07 — Backend Refactoring & Aliases

### Import Aliases & Build Tools

- Refactored 27+ files to use path aliases (`@domain`, `@infra`, `@app`, `@api`) instead of relative imports.
- Configured build tools to support aliases:
  - Installed `tsc-alias` for production build path resolution.
  - Installed `tsconfig-paths` for `ts-node` runtime resolution (dev/start).
  - Updated `package.json` scripts and `tsconfig.json`.
  - Updated `vitest.config.ts` to map aliases for tests.
- Split TypeScript config:
  - `tsconfig.json`: For IDE and typechecking (includes `src/` + `tests/`).
  - `tsconfig.build.json`: For production build (only `src/`, preserves `dist/` structure).

### Type Refactoring

- Centralized `YearRange` and `GenreCount` in `@flows/shared` (removed local definitions).
- Updated various services and repositories to import shared types.

---

## 2025-12-07 — OAuth Flow, Husky, Test Refactoring

### OAuth 2.0 Flow

- Replaced manual `SPOTIFY_REFRESH_TOKEN` with user-friendly OAuth flow
- New routes: `/auth/login`, `/auth/callback`, `/auth/status`
- Token storage in SQLite `token_cache` table
- Auto token refresh with rotation support

### Husky Git Hooks

- Pre-commit: runs `lint` and `format`
- Pre-push: runs `check` and `test`

### Test Reorganization

- Backend tests organized by domain: `tests/unit/spotify/`, `tests/integration/spotify/`
- Added stub tests for future: API contract, error handling, auth flow
- 14 tests passing, 15 TODOs for expansion

---

## 2025-12-06 — Structured Logging, Caching & Resilience

### Deep Structured Logging (Pino)

Added comprehensive logging across the backend:

```typescript
import { logger } from '../infrastructure/logger';
const log = logger.child({ module: 'SQLiteTrackRepository' });

log.info({ trackCount: tracks.length }, 'Saving tracks to SQLite');
log.debug({ page, limit, query }, 'Searching tracks');
```

**Logged operations:**

- `SQLiteTrackRepository`: save, findPaginated
- `SpotifyApiAdapter`: fetchTracks, fetchArtistDetails
- `app.ts`: Server startup, request handling

### Rate Limit Auto-Retry

Auto-retry with exponential backoff for Spotify 429 errors:

- Up to 3 retries per request
- Respects `Retry-After` header from Spotify
- Logs each retry attempt

### Unit Tests

Updated mocks to use `fetchArtistDetails`:

**Test Status:** 12 tests passing (5 unit + 7 integration)

### API Caching

In-memory cache with 5-minute TTL:

**Cached endpoints:**

- `GET /api/spotify/genres`
- `GET /api/spotify/years`
- `GET /api/spotify/stats`

Cache invalidated after sync (`POST /run`).

### Environment Files

- Created `packages/backend/.env.example`

---

## 2025-12-05 (Later) — pnpm Workspaces Monorepo

Restructured project to pnpm workspaces:

```text
Before: src/              → After: packages/backend/src/
Before: ui/               → After: packages/ui/
New:    packages/shared/  → Shared types
```

**Package Names:**

- `@flows/backend` - API + domain
- `@flows/ui` - Svelte frontend
- `@flows/shared` - Track, Artist, Album, SearchOptions

**Key Commands:**

```bash
pnpm install                       # All packages
pnpm --filter @flows/backend dev   # Run backend
pnpm --filter @flows/ui dev        # Run UI
pnpm -r run lint                   # Lint all
```

---

## 2025-12-05 — Data Enrichment & Bug Fixes

### New API Fields

| Entity | New Field | Source |
| ------ | --------- | ------ |
| `Track` | `previewUrl` | Spotify 30s audio clip |
| `Track` | `spotifyUrl` | Deep link to Spotify app |
| `Album` | `imageUrl` | Album cover (300px) |
| `Artist` | `imageUrl` | Artist photo (160px) |

### New Filters

| Filter | Param |
| ------ | ----- |
| Has Preview | `?hasPreview=true` |
| Min Popularity | `?minPopularity=30` |

### Critical Bug Fix: INSERT OR REPLACE CASCADE

**The problem:** Using `INSERT OR REPLACE` triggered `ON DELETE CASCADE`, deleting `track_artists` relationships every sync.

```sql
-- Before (broken):
INSERT OR REPLACE INTO tracks ...  -- Triggers DELETE + INSERT

-- After (fixed):
INSERT INTO tracks ...
ON CONFLICT(id) DO UPDATE SET ...  -- True UPSERT, no CASCADE
```

### FTS5 Full-text Search

Implemented full-text search using SQLite FTS5:

```sql
CREATE VIRTUAL TABLE tracks_fts USING fts5(
  track_id, title, album_name, artist_names
);
```

**Features:**

- Prefix matching (`linkin*` finds "Linkin Park")
- Searches across title, album, and artists
- Auto-rebuild on startup and after sync
- 10x faster than LIKE queries

### Other

- Added `data/` to `.gitignore` (SQLite DB files)
- Exported `App` type for Eden client
- Fixed Axios type-only imports

---

## 2025-12-04 (Late Night) — Genre Enrichment & API

### Genre Enrichment

Implemented automatic enrichment of artist genres from Spotify:

```typescript
async fetchArtistGenres(artistIds: string[]): Promise<Map<string, string[]>>
```

**Process:**

1. Extract unique artist IDs from fetched tracks
2. Batch requests to Spotify `/artists?ids=...` (50 per request)
3. Map genres back to tracks
4. Store in `artist_genres` table

### New API Endpoints

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/spotify/tracks/search` | Paginated, filterable search |
| `GET /api/spotify/tracks/:id` | Single track by ID |
| `GET /api/spotify/genres` | All genres with counts |
| `GET /api/spotify/years` | All years with counts |
| `GET /api/spotify/stats` | Summary statistics |

### SQLite Improvements

```sql
CREATE INDEX idx_tracks_album_year ON tracks(album_release_year DESC);
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_artist_genres_genre ON artist_genres(genre);
CREATE VIRTUAL TABLE tracks_fts USING fts5(...);
```

---

## 2025-12-04 — The Great Modernization

### Server: Vanilla HTTP → Hono → Elysia

**Stage 1:** Vanilla Node.js HTTP (~200 lines)

```javascript
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/status') { ... }
});
```

**Stage 2:** Hono (~95 lines)

```typescript
app.get('/api/status', (c) => c.json({ success: true }));
```

**Stage 3:** Elysia + Layered Architecture (current)

```typescript
const app = new Elysia({ adapter: node() })
  .use(createSpotifyRoutes(config))
  .listen({ port: 4173 });
```

### Persistence: JSON → SQLite

```text
Before: outputs/spotify/liked_songs.json
After:  data/flow.db (SQLite)
```

**Schema:**

- `tracks` — Main track data
- `artists` — Artist information
- `track_artists` — Many-to-many relationship
- `artist_genres` — Genre tags

### Architecture: Layered

```text
src/
├── api/            # HTTP layer (Elysia routes)
├── application/    # Use cases
├── domain/         # Entities, ports
└── infrastructure/ # Adapters, repositories, SQLite
```

---

## Earlier in 2025 — Hexagonal Architecture

The backend was restructured to follow **Hexagonal Architecture** (Ports & Adapters):

```text
Before:  Monolithic script
After:   ├── core/     (FlowEngine, Ports)
         ├── adapters/ (SpotifyAdapter, FileSystemAdapter)
         └── cli/      (Entry point)
```

**Tooling:**

- Zod for config validation
- Pino for logging
- Vitest for testing
- Custom typed errors
