# Future Architecture Roadmap

This document outlines the planned evolution of Flow Sample's architecture.

---

## Current State (2025-12-05) ✅

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
| Audio Previews | ⚠️ May be deprecated by Spotify |

---

## 📋 Priority List

### 🔴 Prioridad Alta (próximos pasos)

| # | Item | Descripción |
|---|------|-------------|
| 1 | **Charts/Visualizations** | Genre pie chart, timeline, decade distribution |
| 2 | **Infinite Scroll** | Reemplazar paginación en SpotifyFlow |
| 3 | **Tests** | Más cobertura en usecases y repository |
| 4 | **Logs** | Structured logging mejorado |

### 🟡 Prioridad Media (después)

| # | Item | Descripción |
|---|------|-------------|
| 5 | **Cache endpoints** | genres, years, stats con TTL corto (5 min) |
| 6 | **Responsive polish** | Mobile optimization |
| 7 | **Rate limit retry** | Auto-retry cuando Spotify devuelve 429 |
| 8 | **Limpiar preview si roto** | Verificar si funciona, si no, quitar UI |

### 🟢 Bucket (no perder de vista)

| Item | Notas |
|------|-------|
| **Lyrics Flow** | Data source para LLM futuro |
| **LLM Integration** | Después de tener más data |
| **Docker** | Si necesitás deployar |
| **GitHub Actions** | Si trabajás con otros |
| **PWA** | Si querés instalable |
| **OAuth Flow** | Reemplazar refresh token manual |
| **WebSockets** | Sync en tiempo real |
| **Background Jobs** | Syncs pesados |
| **Social Features** | Comparar con amigos |

---

## Notes

### Rate Limiting

**Existe:**
- Error handling para 429 en CLI

**Falta:**
- Rate limiting en propia API
- Auto-retry cuando Spotify limita

### Cache Strategy

| Endpoint | Cachear | TTL |
|----------|---------|-----|
| `/genres` | ✅ Sí | 5 min |
| `/years` | ✅ Sí | 5 min |
| `/stats` | ✅ Sí | 5 min |
| `/tracks/search` | ❌ No | - |
| Sync | ❌ No | On-demand |

### Spotify API Deprecations (Nov 2024)

Deprecado para nuevas apps:
- ❌ Audio Features (danceability, energy)
- ❌ Audio Analysis
- ❌ Recommendations
- ❌ Related Artists
- ⚠️ 30-second previews (verificar si funciona)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-05 | Skip Docker | Solo dev, no lo necesita aún |
| 2025-12-05 | Skip GitHub Actions | Workflow personal, merge directo a main |
| 2025-12-05 | Skip Audio Features | Deprecado por Spotify Nov 2024 |
| 2025-12-05 | Charts first | Alta demanda, usa datos existentes |
