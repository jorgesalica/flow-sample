# Spotify Liked Songs Export Flow

This document describes the CLI that powers the Spotify liked songs workflow. The entrypoint at `packages/backend/src/cli/index.ts` handles exporting your saved tracks, enriching them with metadata, and saving the result.

## Workflow Overview

1. **Load credentials** — The CLI reads Spotify credentials from `.env` and validates them using Zod.
2. **Authenticate** — The `SpotifyAdapter` uses your refresh token to obtain an access token.
3. **Export & Enrich** — The engine fetches your liked tracks, accumulates them in `data/flow.db` (SQLite).

## Environment Variables

Ensure `packages/backend/.env` is populated:

```bash
cp .env.example packages/backend/.env
```

| Variable | Description |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | Client ID from [Developer Dashboard](https://developer.spotify.com/dashboard). |
| `SPOTIFY_CLIENT_SECRET` | Client Secret (keep private). |
| `SPOTIFY_REDIRECT_URI` | Redirect URI registered in your Spotify app. |
| `SPOTIFY_REFRESH_TOKEN` | Reusable refresh token (stored after first run). |

## Installing Dependencies

```bash
pnpm install
```

## Running the CLI

The CLI is part of the `@flows/backend` package:

```bash
# Run the full flow
pnpm --filter @flows/backend start
```

## Output

Data is stored in the SQLite database at `data/flow.db`.

## Using the Web UI

For a visual experience, run the stack:

```bash
pnpm dev
# Open http://localhost:5173
```

Open the served URL to interact with your data.
