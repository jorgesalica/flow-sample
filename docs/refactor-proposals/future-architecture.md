# Future Architecture Roadmap

This document outlines the planned evolution of Flow Sample's architecture.

---

## Current State (2025-12-06) ✅

### What's Done

```
packages/
├── backend/         @flows/backend (Elysia + SQLite)
├── ui/              @flows/ui (Svelte 5 + Tailwind)
└── shared/          @flows/shared (Shared types)
```

| Feature | Status |
|---------|--------|
| pnpm Workspaces Monorepo | ✅ Done |
| Elysia API | ✅ Done |
| SQLite + FTS5 | ✅ Done |
| Eden Type-safe Client | ✅ Done |
| Flow Registry | ✅ Done |
| Server-side Pagination | ✅ Done |
| Filter Panel | ✅ Done |
| Audio Previews | ✅ Removed (Deprecated) |
| Infinite Scroll | ✅ Done |
| Charts/Visualizations | ✅ Done |
| Structured Logging (Pino) | ✅ Done |
| Unit Tests (Vitest) | ✅ Done (12 tests) |
| E2E Tests (Playwright) | ✅ Done (6 tests) |
| API Cache (5 min TTL) | ✅ Done |
| Responsive Polish | ✅ Done |
| Rate Limit Retry | ✅ Done |

---

## 📋 Priority List

### 🔴 High Priority (Next Steps)

| # | Item | Description |
|---|------|-------------|
| 1 | **Error UI** | Show user-friendly errors when API fails |
| 2 | **More Unit Tests** | Edge cases: error handling, timeouts |

### 🟡 Medium Priority (Later)

| # | Item | Description |
|---|------|-------------|
| 3 | **Responsive polish** | Mobile optimization |
| 4 | **Rate limit retry** | Auto-retry when Spotify returns 429 |

### 🟢 Bucket (Keep in Mind)

| Item | Notes |
|------|-------|
| **Husky pre-push** | Protect main from accidental pushes |
| **Lyrics Flow** | Data source for future LLM |
| **LLM Integration** | After gathering more data |
| **Docker** | If deployment needed |
| **GitHub Actions** | If collaborating with others |
| **PWA** | If installable app wanted |
| **OAuth Flow** | Replace manual refresh token |
| **WebSockets** | Real-time sync |
| **Background Jobs** | Heavy syncs |
| **Social Features** | Compare with friends |

---

## Notes

### Rate Limiting

**Exists:**
- Error handling for 429 in CLI

**Missing:**
- Rate limiting in our own API
- Auto-retry when Spotify throttles

### Cache Strategy

| Endpoint | Cache | TTL |
|----------|-------|-----|
| `/genres` | ✅ Yes | 5 min |
| `/years` | ✅ Yes | 5 min |
| `/stats` | ✅ Yes | 5 min |
| `/tracks/search` | ❌ No | - |
| Sync | ❌ No | On-demand |

### Spotify API Deprecations (Nov 2024)

Deprecated for new apps:
- ❌ Audio Features (danceability, energy)
- ❌ Audio Analysis
- ❌ Recommendations
- ❌ Related Artists
- ⚠️ 30-second previews (verify if working)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-06 | Added Playwright E2E | Smoke tests for critical flows |
| 2025-12-06 | Deep logging in Repo/Adapter | Better observability for debugging |
| 2025-12-05 | Skip Docker | Solo dev, no lo necesita aún |
| 2025-12-05 | Skip GitHub Actions | Workflow personal, merge directo a main |
| 2025-12-05 | Skip Audio Features | Deprecado por Spotify Nov 2024 |
| 2025-12-05 | Charts first | Alta demanda, usa datos existentes |

