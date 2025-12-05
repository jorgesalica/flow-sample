# Project History

A narrative changelog documenting the evolution of Flow Sample.

---

## 2025-12-04 — The Great Modernization

### UI: Vanilla JS → Svelte 5

The UI started as a **single-page vanilla JavaScript application** with hand-written DOM manipulation:

```javascript
// The old way (vanilla JS)
const grid = document.getElementById('track-grid');
tracks.forEach(track => {
  const card = document.createElement('article');
  card.innerHTML = `<h3>${track.title}</h3>...`;
  grid.appendChild(card);
});
```

Today, it's a **modern Svelte 5 application** with reactive stores:

```svelte
<!-- The new way (Svelte) -->
{#each $filteredTracks as track (track.id)}
  <TrackCard {track} />
{/each}
```

**What changed:**
- 📦 Vite 7 for lightning-fast builds
- 🎨 Tailwind CSS 4 for utility-first styling
- 🔄 Svelte stores for state management
- 📝 TypeScript for type safety
- 🧹 ESLint + Prettier for code quality

### Server: Vanilla HTTP → Hono → Elysia

The server evolved through multiple stages:

**Stage 1: Vanilla Node.js HTTP** (~200 lines)
```javascript
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/status') { ... }
});
```

**Stage 2: Hono** (~95 lines)
```typescript
app.get('/api/status', (c) => c.json({ success: true }));
```

**Stage 3: Elysia + Layered Architecture** (current)
```typescript
const app = new Elysia({ adapter: node() })
  .use(createSpotifyRoutes(config))
  .listen({ port: 4173 });
```

### Persistence: JSON → SQLite

Data storage migrated from flat JSON files to **SQLite**:

```
Before: outputs/spotify/liked_songs.json
After:  data/flow.db (SQLite with proper schema)
```

**Schema includes:**
- `tracks` — Main track data
- `artists` — Artist information
- `track_artists` — Many-to-many relationship
- `artist_genres` — Genre tags

### Architecture: Layered

Restructured from monolithic to **Layered Architecture**:

```
src/
├── api/            # HTTP layer (Elysia routes)
├── application/    # Use cases
├── domain/         # Entities, ports
└── infrastructure/ # Adapters, repositories, SQLite
```

### Documentation

Updated `docs/architecture/`:
- `README.md` — Layered architecture overview
- `server.md` — Elysia server details
- `backend.md` — Domain/infra layer docs

---

## 2025-12-04 (Late Night) — Genre Enrichment & API Improvements

### Genre Enrichment

Implemented automatic enrichment of artist genres from Spotify:

```typescript
// SpotifyApiAdapter now fetches artist details
async fetchArtistGenres(artistIds: string[]): Promise<Map<string, string[]>>
```

**Process:**
1. Extract unique artist IDs from fetched tracks (753 artists)
2. Batch requests to Spotify `/artists?ids=...` (50 per request)
3. Map genres back to tracks
4. Store in `artist_genres` table

**Result:** 272 unique genres across 1000 tracks.

### New API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/spotify/tracks/search` | Paginated, filterable search |
| `GET /api/spotify/tracks/:id` | Single track by ID |
| `GET /api/spotify/genres` | All genres with counts |
| `GET /api/spotify/years` | All years with counts |
| `GET /api/spotify/stats` | Summary statistics |

**Search supports:**
- `?page=1&limit=50` — Pagination
- `?q=linkin` — Text search
- `?genre=rock` — Filter by genre
- `?year=2020` — Filter by year
- `?sortBy=popularity&sortOrder=desc` — Sorting

### SQLite Improvements

Added new indexes and FTS5 virtual table:

```sql
CREATE INDEX idx_tracks_album_year ON tracks(album_release_year DESC);
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_artist_genres_genre ON artist_genres(genre);

CREATE VIRTUAL TABLE tracks_fts USING fts5(...);
CREATE TABLE token_cache (...);  -- For future OAuth caching
```

### Stats Endpoint Example

```json
{
  "totalTracks": 1000,
  "totalGenres": 272,
  "topGenres": [
    { "genre": "ambient", "count": 123 },
    { "genre": "argentine rock", "count": 123 }
  ],
  "decadeDistribution": {
    "2020s": 331, "2010s": 272, "2000s": 169
  },
  "yearRange": { "oldest": 1964, "newest": 2025 }
}
```

---

## Earlier in 2025 — Hexagonal Architecture

### Backend Refactoring

The backend was restructured to follow **Hexagonal Architecture** (Ports & Adapters):

```
Before:  Monolithic script with Spotify API calls mixed with file I/O
After:   Clean separation of concerns
         ├── core/        (FlowEngine, Ports, Types)
         ├── adapters/    (SpotifyAdapter, FileSystemAdapter)
         └── cli/         (Entry point)
```

**Key decisions:**
- **Ports** define what the core needs (interfaces)
- **Adapters** implement how to satisfy those needs
- **FlowEngine** orchestrates without knowing implementation details

### Tooling Improvements

- **Zod** for runtime config validation
- **Pino** for structured JSON logging
- **Vitest** for unit testing
- **Custom typed errors** (`SpotifyAuthError`, `SpotifyRateLimitError`, `StorageError`)

---

## Project Origin — The First Flows

The project began as an exploration of **data flows** — ways to extract, transform, and visualize data from various sources.

**Spotify Flow** was the first:
- Fetch liked songs from Spotify API
- Enrich with artist genres
- Save to JSON
- Visualize in a web UI

The name "Flow Sample" reflects its nature: a sample implementation of the flow concept, meant to be extended with more flows (YouTube, Apple Music, etc.) in the future.

---

## Future Direction

- 🔍 Search and filtering in UI
- 📊 More visualizations (charts, timelines)
- 🎵 Additional flows (YouTube Music, Apple Music)
- 📱 Mobile-responsive design improvements
