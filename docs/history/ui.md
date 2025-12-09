# UI History

Changelog for the frontend (Svelte) application.

---

## 2025-12-07 — Type Centralization

### Centralized Types in @flows/shared
All shared types now live in `@flows/shared` and are re-exported from `lib/types.ts`:

| Type | Description |
|------|-------------|
| `GenreCount` | `{ genre, count }` for genre stats |
| `YearCount` | `{ year, count }` for year stats |
| `SelectOption` | `{ value, label }` for dropdowns |
| `YearRange` | `{ oldest, newest }` for stats |
| `StatusMessage` | `{ message, tone }` for status |
| `StatusTone` | `'info' | 'success' | 'warning' | 'error'` |

### Components Updated
- `GenreFilter.svelte`, `YearFilter.svelte`, `FilterPanel.svelte`: use `GenreCount`, `YearCount`
- `GenreChart.svelte`: uses `GenreCount`
- `FilterSelect.svelte`: uses `SelectOption`
- `stores.ts`: uses `StatusMessage`, `TopStats`

### Removed
- `lib/stores/index.ts` (duplicate file, was conflicting with `stores.ts`)

---

## 2025-12-07 — Component Reorganization & Path Aliases

### Component Directory Restructure
Organized 18 components into 5 semantic folders:

| Folder | Components |
|--------|------------|
| `track/` | TrackCard, AlbumArt, GenreBadges |
| `filters/` | FilterPanel, FilterSelect, GenreFilter, YearFilter, PopularitySlider |
| `charts/` | GenreChart, DecadeChart, InsightsPanel |
| `common/` | SearchBar, Pagination, InfiniteScroll, MetricCard |
| `layout/` | Controls, Navbar, SpotifyHeader |

### Split Components
Extracted reusable sub-components from TrackCard:
- `AlbumArt.svelte`: Album image, duration overlay, Spotify link
- `GenreBadges.svelte`: Genre tag display
- `FilterSelect.svelte`: Generic select wrapper
- `PopularitySlider.svelte`: Range slider component

### Path Aliases
Configured Vite + TypeScript for cleaner imports:
```typescript
// Before
import { stores } from '../../stores';

// After
import { stores } from '@lib/stores';
import TrackCard from '@components/track/TrackCard.svelte';
```

### TypeScript Target
Updated `tsconfig.app.json` target from ES2022 → **ES2024**.

---

## 2025-12-07 — Component Refactor & UI Polish

### Refactoring

Broken down `SpotifyFlow.svelte` into manageable sub-components:
- `SpotifyHeader.svelte`: Page title and top-level stats.
- `InsightsPanel.svelte`: Container for charts (Genre/Decade).

### UI Enhancements

- **Navbar**: Added background (`bg-void/80 backdrop-blur-md`) and increased page padding (`pt-28`) to prevent overlap.
- **Filter Panel**: Made background fully opaque (`bg-void`) and fixed dropdown option colors for dark theme.
- **Track Cards**: Updated popularity bar design with gradient and clearer rail.
- **Feedback**: Added hover/active scaling to control buttons.

### Sync Cancellation

Implemented `AbortController` in `api.ts` to allow cancelling the Spotify Sync process:
- Added "Cancel" state to Sync button.
- Properly tracks global `syncToastId` to dismiss loading toast on cancel.

### Fixes

- Fixed `app.css` 500 error by correcting invalid Tailwind 4 `@apply` utility.

---

## 2025-12-06 — Cosmic Flow UI Theme

### Design System

Created `docs/design-system.md` with dark space-themed palette:
- **Void** (#0a0f1c): Deep black for backgrounds
- **Nebula** (#3b82f6): Blue for accents
- **Aurora** (#34d399): Emerald green for primary actions
- **Pulsar** (#94a3b8): Muted text
- **Cosmic** (#e2e8f0): Light text

### Components Updated

All components refactored with consistent theming:
- `TrackCard.svelte`: Aurora/nebula colors, void backgrounds
- `Controls.svelte`: Glass effect, btn-primary style
- `FilterPanel.svelte`: Aurora accents, void dropdowns
- `GenreChart.svelte`: Cosmic color palette, styled tooltips
- `Landing.svelte`: text-cosmic gradient, glass-hover cards
- `SpotifyFlow.svelte`: Removed StatusBanner, new header styling

### Toast Notifications

Replaced `StatusBanner` with `svelte-5-french-toast`.
- Utility wrapper: `lib/toast.ts`
- Added to `lib/api.ts` for error handling

---

## 2025-12-06 — E2E Testing with Playwright

### Playwright Setup

Installed and configured Playwright for end-to-end testing:

```bash
pnpm --filter @flows/ui add -D @playwright/test
npx playwright install chromium
```

**Configuration (`playwright.config.ts`):**
- Headless Chromium
- HTML report output
- Auto-starts dev server for tests
- Screenshot on failure

### Smoke Tests

Created `e2e/smoke.spec.ts` with 3 tests:

| Test | Description |
|------|-------------|
| Landing page loads | Verifies h1 and "Spotify Flow" text visible |
| Navigate to Spotify Flow | Clicks card, verifies URL change |
| Spotify Flow shows content | Checks for tracks or Sync button |

**Commands:**
```bash
pnpm --filter @flows/ui run test:e2e      # Headless
pnpm --filter @flows/ui run test:e2e:ui   # Interactive UI
```

### Gitignore Updates

Added to `.gitignore`:
- `packages/ui/playwright-report/`
- `packages/ui/test-results/`

---


## 2025-12-05 (Later) — pnpm Workspaces & Fixes

### Monorepo Migration

Moved to `packages/ui/` with workspace dependencies:

```json
{
  "dependencies": {
    "@flows/shared": "workspace:*",
    "@flows/backend": "workspace:*"
  }
}
```

### Fixes

- **moduleResolution: bundler** in tsconfig
- **a11y labels** - Added id/for to all FilterPanel controls
- **Types from shared** - `import { Track } from '@flows/shared'`

---

## 2025-12-05 — UI Overhaul & Data Enrichment

### Landing Page & Routing

Added hash-based routing:

```
#/         → Landing (flow selection)
#/spotify  → SpotifyFlow (track explorer)
```

**New pages:**
- `Landing.svelte` — Flow cards with stats
- `SpotifyFlow.svelte` — Complete track explorer

### Server-Side Pagination & Filters

Replaced client-side filtering with **server-side** approach:

| Filter | API Param |
|--------|-----------|
| Search | `?q=linkin` |
| Genre | `?genre=rock` |
| Year | `?year=2020` |
| Has Preview | `?hasPreview=true` |
| Min Popularity | `?minPopularity=30` |
| Sort | `?sortBy=popularity&sortOrder=desc` |

**New `FilterPanel` component** — expandable panel with all filter controls.

### TrackCard Enrichment

Track cards now display:

- **Album art** (300px, from Spotify)
- **Artist avatar** (circular, 160px)
- **Spotify link** (green button, opens app on mobile)
- **Preview button** (if available)
- Genre badges, popularity bar, added date

### Flow Registry

New dynamic flow registration system:

```
ui/src/lib/flows/
├── registry.ts   ← FlowDefinition, registerFlow, getFlows
├── spotify.ts    ← Auto-registers Spotify Flow
└── index.ts      ← Exports + imports flows
```

Landing page now loads flows dynamically from the registry.

### Eden Type-safe Client

Added `@elysiajs/eden` for type-safe API calls:

```typescript
import { api } from './client';
const { data } = await api.spotify.tracks.search.get({ query: { q: 'rock' } });
// data is fully typed!
```

### Improvements

- Fixed dropdown styling (dark theme)
- Svelte 5 syntax updates (`$state`, `$derived`)
- Fixed all lint errors (each-block keys, unused vars)
- Fixed a11y labels (form control associations)

---

## 2025-12-04 — Vanilla JS → Svelte 5

The UI started as a **single-page vanilla JavaScript application** with hand-written DOM manipulation:

```javascript
// The old way (vanilla JS)
const grid = document.getElementById('track-grid');
tracks.forEach((track) => {
  const card = document.createElement('article');
  card.innerHTML = `<h3>${track.title}</h3>...`;
  grid.appendChild(card);
});
```

Today, it's a **modern Svelte 5 application** with reactive stores:

```svelte
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
