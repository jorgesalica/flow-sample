# Future Architecture Roadmap

This document outlines the planned evolution of Flow Sample's architecture.

---

## Current State (2025-12-04)

```
src/
├── server/              # Hono (lightweight HTTP)
└── spotify-flow/        # Monolithic flow
    ├── core/            # Domain + Ports
    ├── adapters/        # Spotify, FileSystem
    ├── config/
    └── cli/
```

- **Server:** Hono (~95 lines)
- **Persistence:** JSON files
- **UI:** Svelte 5 (single flow view)

---

## Target Architecture

### Backend: Elysia + Layered Architecture

```
src/
├── domain/                     # Pure business logic
│   ├── flows/
│   │   ├── spotify/
│   │   │   ├── entities.ts     # Track, Artist, Album
│   │   │   ├── repository.ts   # Interface
│   │   │   └── service.ts      # SpotifyFlowService
│   │   └── lyrics/             # Future flow
│   │       ├── entities.ts
│   │       └── service.ts
│   └── shared/
│       ├── ports.ts            # Generic interfaces
│       └── errors.ts           # Domain errors
│
├── infrastructure/             # External integrations
│   ├── adapters/
│   │   ├── spotify-api/        # Spotify Web API
│   │   ├── genius-api/         # Lyrics (future)
│   │   └── llm/                # LLM agents (future)
│   ├── persistence/
│   │   └── sqlite/             # SQLite via better-sqlite3
│   └── repositories/           # Repository implementations
│
├── application/                # Use cases / orchestration
│   ├── spotify.usecase.ts
│   └── lyrics.usecase.ts
│
└── api/                        # Elysia routes
    ├── app.ts                  # Main Elysia app
    ├── spotify.routes.ts
    └── lyrics.routes.ts
```

### Why Elysia?

| Feature | Benefit |
|---------|---------|
| Plugin system | Dependency injection without decorators |
| TypeBox validation | Runtime validation with compile-time types |
| Eden client | Type-safe API client for Svelte UI |
| Route groups | Clean separation by domain |
| Bun-first | Fast cold starts, native TypeScript |

### Persistence: SQLite

Migrate from JSON files to SQLite for:
- Complex queries (aggregations, joins)
- Better performance with large datasets
- ACID transactions
- Easy backup/restore

```sql
-- Schema sketch
CREATE TABLE tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    added_at DATETIME,
    duration_ms INTEGER,
    popularity INTEGER
);

CREATE TABLE artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE track_artists (
    track_id TEXT,
    artist_id TEXT,
    FOREIGN KEY (track_id) REFERENCES tracks(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id)
);
```

---

## UI Evolution

### Current: Single Flow View

The UI currently shows only the Spotify flow.

### Target: Flow Toolkit

```
┌─────────────────────────────────────────────────────┐
│  Flow Toolkit                              [+ New]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  🎵         │  │  📝         │  │  🤖         │  │
│  │  Spotify    │  │  Lyrics     │  │  AI         │  │
│  │  Explorer   │  │  Scraper    │  │  Insights   │  │
│  │             │  │             │  │             │  │
│  │  1,247      │  │  Not        │  │  Coming     │  │
│  │  tracks     │  │  configured │  │  soon       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Each flow registers itself with:
- Name, icon, description
- Status (configured, active, disabled)
- Entry point component

---

## LLM Integration (Future)

### Location

```
src/infrastructure/adapters/llm/
├── mastra/                 # Mastra integration
│   ├── client.ts
│   └── agents/
│       └── music-analyst.ts
└── prompts/
    ├── describe-taste.txt
    └── analyze-lyrics.txt
```

### Use Cases

| Flow | Agent Capability |
|------|------------------|
| Spotify | "Analyze my listening evolution in 2024" |
| Lyrics | "Find songs about [theme]" |
| Cross-flow | "Compare my Spotify taste with my lyric preferences" |

---

## Migration Path

### Phase 1: SQLite
- [ ] Add `better-sqlite3` dependency
- [ ] Create schema migrations
- [ ] Implement SQLite repository
- [ ] Migrate data from JSON

### Phase 2: Elysia
- [ ] Replace Hono with Elysia
- [ ] Restructure to layered architecture
- [ ] Add route groups per flow
- [ ] Generate Eden client for UI

### Phase 3: Multi-Flow UI
- [ ] Create flow registry
- [ ] Build toolkit dashboard
- [ ] Make flows pluggable

### Phase 4: LLM Agents
- [ ] Choose provider (Mastra, LangChain, etc.)
- [ ] Create first agent (music taste analyzer)
- [ ] Integrate with UI

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-04 | Elysia over NestJS | Right balance of structure without boilerplate |
| 2025-12-04 | SQLite over Postgres | Local-first, no server needed |
| 2025-12-04 | Mastra for LLM | TypeScript-first, agentic framework |
