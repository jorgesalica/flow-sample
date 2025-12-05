# Server Architecture

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Elysia** | Web framework (TypeBox validation, plugin system) |
| **@elysiajs/node** | Node.js adapter |
| **@elysiajs/static** | Static file serving |
| **TypeScript** | Type safety |

## Why Elysia?

- **Plugin system** — Dependency injection without decorators
- **TypeBox validation** — Runtime validation with compile-time types
- **Eden client** — Type-safe API client for frontend (future)
- **Route groups** — Clean separation by domain
- **Node.js adapter** — Works with existing Node.js ecosystem

## Directory Structure

```
src/api/
├── app.ts              # Main Elysia server
├── spotify.routes.ts   # Spotify route group
├── config.ts           # Zod config loader
└── index.ts            # Barrel exports
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Health check |
| `POST` | `/api/spotify/run` | Fetch tracks and save to SQLite |
| `GET` | `/api/spotify/tracks` | Get all tracks from SQLite |
| `GET` | `/api/spotify/count` | Get track count |
| `GET` | `/outputs/*` | Serve output files |
| `GET` | `/*` | Serve UI static files (production) |

## Request/Response Examples

### Health Check
```http
GET /api/status

{ "success": true, "message": "Server ready." }
```

### Run Spotify Flow
```http
POST /api/spotify/run
Content-Type: application/json

{ "limit": 50 }
```

Response:
```json
{
  "success": true,
  "message": "Flow completed.",
  "count": 1247,
  "output": "liked_songs.json"
}
```

### Get All Tracks
```http
GET /api/spotify/tracks

[
  {
    "id": "abc123",
    "title": "Song Name",
    "artists": [{ "id": "...", "name": "Artist" }],
    "album": { "id": "...", "name": "Album", "releaseYear": 2024 },
    ...
  }
]
```

## Code Overview

```typescript
import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { staticPlugin } from '@elysiajs/static';

const app = new Elysia({ adapter: node() })
  .get('/api/status', () => ({ success: true }))
  .use(createSpotifyRoutes(config))
  .use(staticPlugin({ assets: 'outputs', prefix: '/outputs' }))
  .listen({ port: 4173 });
```

## Running the Server

```bash
# Development
npm run server

# The server will:
# - Start on http://127.0.0.1:4173
# - Create SQLite database at data/flow.db
# - Serve API endpoints
# - Serve UI from ui/dist (if built)
```
