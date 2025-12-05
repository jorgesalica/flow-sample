# Spotify Flow UI

A modern Svelte frontend for exploring your Spotify liked songs.

## Tech Stack

- **Svelte 5** — Reactive UI framework
- **Vite 7** — Build tool and dev server
- **Tailwind CSS 4** — Utility-first styling
- **TypeScript** — Type safety

## Quick Start

```bash
# Install dependencies
npm install

# Development server (port 5173)
npm run dev

# Production build
npm run build
```

## Project Structure

```
src/
├── App.svelte              # Main application
├── main.ts                 # Entry point
├── app.css                 # Global styles + Tailwind
└── lib/
    ├── config.ts           # Constants (endpoints, app config)
    ├── api.ts              # API client functions
    ├── types.ts            # TypeScript interfaces
    ├── stores/
    │   └── index.ts        # Svelte stores (state)
    └── components/
        ├── index.ts        # Barrel exports
        ├── Controls.svelte
        ├── MetricCard.svelte
        ├── StatusBanner.svelte
        └── TrackCard.svelte
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run check` | Svelte + TypeScript check |

## Development

The UI connects to the backend server for:
- `GET /outputs/spotify/liked_songs.json` — Load saved tracks
- `POST /api/spotify/run` — Trigger Spotify fetch

In development, Vite proxies API requests to `http://127.0.0.1:4173` (see `vite.config.ts`).

## Documentation

See [UI Architecture](../docs/architecture/ui.md) for detailed documentation.
