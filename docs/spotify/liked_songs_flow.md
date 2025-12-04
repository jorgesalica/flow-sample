# Spotify Liked Songs Export Flow

This document describes the CLI that powers the Spotify liked songs workflow. The entrypoint at `src/spotify-flow/cli/index.ts` handles exporting your saved tracks, enriching them with metadata, and saving the result.

## Workflow Overview

1. **Load credentials** — The CLI reads Spotify credentials from `.env` and validates them using Zod.
2. **Authenticate** — The `SpotifyAdapter` uses your refresh token to obtain an access token.
3. **Export & Enrich** — The engine fetches your liked tracks, enriches them with album and artist metadata, and saves the result to `outputs/spotify/enriched_likes.json`.

## Environment Variables

Copy `.env.example` to `.env` and populate:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | Client ID from [Developer Dashboard](https://developer.spotify.com/dashboard). |
| `SPOTIFY_CLIENT_SECRET` | Client Secret (keep private). |
| `SPOTIFY_REDIRECT_URI` | Redirect URI registered in your Spotify app. |
| `SPOTIFY_REFRESH_TOKEN` | Reusable refresh token (stored after first run). |
| `SPOTIFY_PAGE_LIMIT` (optional) | Number of pages to fetch (default: 20, ~1000 tracks). |

## Installing Dependencies

```bash
npm install
```

## Running the CLI

The CLI has a single command that runs the full flow:

```bash
# Run the full flow (Export -> Enrich -> Save)
npx ts-node src/spotify-flow/cli/index.ts run

# Limit the number of pages fetched (default: 20)
npx ts-node src/spotify-flow/cli/index.ts run --limit 5
```

## Output

After the flow completes, a single file is written:

- `outputs/spotify/enriched_likes.json` — Full track data with album, artist, and metadata.

## Using the Web UI

For a visual experience, run the server:

```bash
npm run spotify:server
```

Open the served URL to interact with your data.
