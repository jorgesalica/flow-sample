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

### Server: Vanilla HTTP → Hono

The server was **~200 lines of raw Node.js HTTP**:

```javascript
// The old way
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }
  // ...50 more if statements
});
```

Now it's **~95 lines with Hono**:

```typescript
// The new way
app.get('/api/status', (c) => c.json({ success: true }));
app.post('/api/spotify/run', async (c) => { /* ... */ });
```

**What changed:**
- 🔥 Hono framework (~14kb, TypeScript-first)
- 🔌 Built-in CORS and logging middleware
- 📂 Clean separation of API routes and static serving

### Architecture: Documented

Created `docs/architecture/` with detailed documentation:
- `README.md` — High-level overview
- `ui.md` — Frontend architecture (Svelte, stores, tooling)
- `server.md` — Server architecture (Hono, endpoints)
- `backend.md` — Backend architecture (Hexagonal, ports/adapters)

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
