# Getting Started

> **Purpose**: Technical guide to set up, launch, and use the Spotify Flow.

---

## Prerequisites

### 1. Environment Variables

Copy the example file and fill in your Spotify credentials:

```bash
cp packages/backend/.env.example packages/backend/.env
```

| Variable | Description |
| -------- | ----------- |
| `SPOTIFY_CLIENT_ID` | Client ID from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | Client Secret (keep private) |
| `SPOTIFY_REDIRECT_URI` | Must be `http://127.0.0.1:4173/api/spotify/auth/callback` |

### 2. Install Dependencies

```bash
pnpm install
```

---

## Launch

Start both backend and frontend with a single command:

```bash
pnpm dev
```

| Service | URL | Stack |
| ------- | --- | ----- |
| **Backend** | `http://localhost:4173` | ElysiaJS + SQLite |
| **Frontend** | `http://localhost:5173` | Svelte 5 + Vite + Tailwind 4 |

---

## Connect (First Time)

1. Open `http://localhost:5173`
2. Navigate to **Spotify Flow** (`#/spotify`)
3. Click **"Connect with Spotify"**
4. Authorize in the Spotify popup
5. You'll be redirected back — connection established

> The refresh token is stored in SQLite. You won't need to re-authorize unless you revoke access.

---

## Sync

Click **"Sync with Spotify"** to fetch your liked songs.

The sync process:

1. Fetches all liked tracks (paginated)
2. Enriches with artist genres and images
3. Stores in `data/flow.db` (SQLite)
4. Rebuilds the full-text search index

---

## Explore

### Dashboard Features

| Feature | Description |
| ------- | ----------- |
| **Infinite Scroll** | Scroll to load more tracks automatically |
| **Search** | Real-time full-text search (title, artist, album) |
| **Filters** | Genre, Year, Popularity, Sort order |
| **Track Cards** | Album art, artist avatar, genre badges, Spotify link |

### Insights (Charts)

| Chart | Description |
| ----- | ----------- |
| **Genre Distribution** | Doughnut chart of your top genres |
| **Eras Timeline** | Bar chart showing decades (60s → 2020s) |

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| **Frontend** | Svelte 5 (Runes), Tailwind CSS 4, Chart.js, Vite 7 |
| **Backend** | ElysiaJS, SQLite (FTS5), Pino logger |
| **Shared** | TypeScript, Eden client (end-to-end types) |
| **Tooling** | pnpm workspaces, Vitest, Playwright, Husky |

---

## Useful Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start full stack (backend + frontend) |
| `pnpm -r run lint` | Lint all packages |
| `pnpm -r run check` | Type-check all packages |
| `pnpm -r run test` | Run all tests |
| `pnpm --filter @flows/backend test` | Run backend tests only |
| `pnpm --filter @flows/ui test:e2e` | Run Playwright E2E tests |
