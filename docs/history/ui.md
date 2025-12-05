# UI History

Changelog for the frontend (Svelte) application.

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
