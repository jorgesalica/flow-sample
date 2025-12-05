# Backend History

Changelog for the backend (API, persistence, domain logic).

---

## 2025-12-05 — Data Enrichment & Bug Fixes

### New API Fields

| Entity | New Field | Source |
|--------|-----------|--------|
| `Track` | `previewUrl` | Spotify 30s audio clip |
| `Track` | `spotifyUrl` | Deep link to Spotify app |
| `Album` | `imageUrl` | Album cover (300px) |
| `Artist` | `imageUrl` | Artist photo (160px) |

### New Filters

| Filter | Param |
|--------|-------|
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
|----------|-------------|
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

```
Before: outputs/spotify/liked_songs.json
After:  data/flow.db (SQLite)
```

**Schema:**
- `tracks` — Main track data
- `artists` — Artist information
- `track_artists` — Many-to-many relationship
- `artist_genres` — Genre tags

### Architecture: Layered

```
src/
├── api/            # HTTP layer (Elysia routes)
├── application/    # Use cases
├── domain/         # Entities, ports
└── infrastructure/ # Adapters, repositories, SQLite
```

---

## Earlier in 2025 — Hexagonal Architecture

The backend was restructured to follow **Hexagonal Architecture** (Ports & Adapters):

```
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
