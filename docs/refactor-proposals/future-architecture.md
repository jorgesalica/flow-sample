# Future Architecture Roadmap

This document outlines the planned evolution of Flow Sample's architecture.

---

## Current State (2025-12-06)

```
packages/
├── backend/         @flows/backend (Elysia + SQLite)
├── ui/              @flows/ui (Svelte 5 + Tailwind)
└── shared/          @flows/shared (Shared types)
```

### Completed Features

| Feature | Status |
|---------|--------|
| pnpm Workspaces Monorepo | ✅ |
| Elysia API | ✅ |
| SQLite + FTS5 | ✅ |
| Eden Type-safe Client | ✅ |
| Flow Registry | ✅ |
| Server-side Pagination | ✅ |
| Filter Panel | ✅ |
| Infinite Scroll | ✅ |
| Charts (Chart.js) | ✅ |
| Structured Logging (Pino) | ✅ |
| Unit Tests (14 tests) | ✅ |
| E2E Tests (8 tests) | ✅ |
| API Cache (5 min TTL) | ✅ |
| Rate Limit Auto-Retry | ✅ |
| Toast Notifications | ✅ |
| Cosmic Flow UI Theme | ✅ |
| Inter Font + Background Effects | ✅ |

---

## Architecture Decisions

### API Caching

| Endpoint | Cached | TTL |
|----------|--------|-----|
| `/genres` | ✅ | 5 min |
| `/years` | ✅ | 5 min |
| `/stats` | ✅ | 5 min |
| `/tracks/search` | ❌ | - |
| Sync (POST) | ❌ | Invalidates cache |

### Spotify API Constraints (Nov 2024)

Deprecated for new apps:
- ❌ Audio Features (danceability, energy)
- ❌ Audio Analysis
- ❌ Recommendations
- ❌ Related Artists
- ⚠️ 30-second previews (partially working)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-06 | Cosmic Flow UI theme | Space-themed dark design |
| 2025-12-06 | Toast notifications | Replace StatusBanner |
| 2025-12-06 | Playwright E2E | Smoke tests for critical flows |
| 2025-12-06 | Deep logging | Better observability |
| 2025-12-05 | Skip Docker | Solo dev, not needed yet |
| 2025-12-05 | Skip GitHub Actions | Personal workflow |
| 2025-12-05 | Charts first | Uses existing data |

---

> **Note:** Future tasks and ideas are tracked in [bucket.md](../bucket.md)
