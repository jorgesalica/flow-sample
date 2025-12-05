# UI Architecture

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Svelte** | 5.x | Reactive UI framework |
| **Vite** | 7.x | Build tool & dev server |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **TypeScript** | 5.x | Type safety |

## Directory Structure

```
ui/
├── src/
│   ├── App.svelte              # Router (hash-based)
│   ├── main.ts                 # Entry point
│   ├── app.css                 # Global styles + Tailwind
│   └── lib/
│       ├── config.ts           # API endpoints
│       ├── api.ts              # API client (loadTracks, fetchFromSpotify)
│       ├── types.ts            # TypeScript interfaces imported from @flows/shared
│       ├── stores.ts           # Svelte stores (server-side pagination)
│       ├── utils.ts            # Utilities (debounce)
│       ├── pages/
│       │   ├── index.ts
│       │   ├── Landing.svelte  # Home page with flow cards
│       │   └── SpotifyFlow.svelte
│       └── components/
│           ├── index.ts
│           ├── Controls.svelte     # Refresh/Sync buttons
│           ├── FilterPanel.svelte  # Expandable filter panel
│           ├── MetricCard.svelte
│           ├── InfiniteScroll.svelte # IntersectionObserver loader
│           ├── GenreChart.svelte   # Doughnut chart (Chart.js)
│           ├── DecadeChart.svelte  # Bar chart (Chart.js)
│           ├── SearchBar.svelte
│           ├── StatusBanner.svelte
│           └── TrackCard.svelte    # With album art, artist avatar, Spotify link
├── vite.config.ts
├── tailwind.config.js
├── eslint.config.js
└── .prettierrc
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `#/` | Flow selection (toolbox) |
| **SpotifyFlow** | `#/spotify` | Track explorer with filters, infinite scroll, and charts |

## State Management

Uses Svelte stores with **server-side pagination** and **charts data**:

```typescript
// stores.ts
export const tracks = writable<Track[]>([]);
export const totalTracks = writable(0);
export const searchOptions = writable<SearchOptions>({});
export const topStats = writable({
    total: 0,
    artists: 0,
    topGenre: '—',
    genres: [],
    decadeDistribution: {}
});
```

## API Client

| Function | Purpose |
|----------|---------|
| `loadTracks(options, append)` | Fetch tracks (append=true for infinite scroll) |
| `updateStats()` | Fetch summary statistics and chart data |
| `fetchFromSpotify()` | Trigger sync from Spotify API |

## Filter Panel Features

The `FilterPanel` component provides:

- **Genre** dropdown
- **Year** dropdown
- **Sort By** (Date Added, Popularity, Title)
- **Sort Order** (Asc/Desc)
- **Min Popularity** slider (0-100)
- **(Removed)** Audio Preview toggle (functionality deprecated)

## TrackCard Features

Each track card displays:

- Album art (300px)
- **Artist avatar** (circular, 160px) or initials fallback
- Title, artists, album name
- Genre badges (top 2)
- Popularity bar
- Added date
- **Spotify link** (green button on hover)

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Store
    participant API
    participant Server

    User->>UI: Apply filters
    UI->>API: loadTracks({ genre, year, ... })
    API->>Server: GET /api/spotify/tracks/search?...
    Server-->>API: { data, total, page, totalPages }
    API->>Store: tracks.set(data)
    Store-->>UI: Re-render grid
```

## Tooling

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `pnpm --filter @flows/ui run dev` | Start dev server (port 5173) |
| `build` | `pnpm --filter @flows/ui run build` | Production build |
| `lint` | `pnpm --filter @flows/ui run lint` | ESLint check |
| `check` | `pnpm --filter @flows/ui run check` | Svelte + TypeScript check |
