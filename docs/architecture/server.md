# Server Architecture

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Hono** | 4.x | Lightweight web framework |
| **@hono/node-server** | - | Node.js adapter |
| **TypeScript** | 5.x | Type safety |

## Why Hono?

- **Ultra lightweight** (~14kb)
- **TypeScript first**
- **Express-like API** (familiar patterns)
- **Multi-runtime** (Node, Deno, Bun, Cloudflare Workers)
- **Built-in middleware** (CORS, logger, etc.)

## Directory Structure

```
src/server/
└── index.ts    # Server entry point
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/status` | Health check |
| `POST` | `/api/spotify/run` | Execute Spotify flow |
| `GET` | `/outputs/*` | Serve output files |
| `GET` | `/*` | Serve UI static files |

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
  "output": "liked_songs.json"
}
```

## Code Overview

```typescript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Routes
app.get('/api/status', (c) => c.json({ success: true }));
app.post('/api/spotify/run', async (c) => { ... });

// Static files
app.use('/outputs/*', serveStatic({ root: projectRoot }));
app.use('/*', serveStatic({ root: 'ui/dist' }));

serve({ fetch: app.fetch, port: 4173 });
```

## Running the Server

```bash
# Development (with ts-node)
npm run server

# Production (after build)
node dist/server/index.js
```
