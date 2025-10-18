# Spotify Liked Songs Export Flow

This document walks through the TypeScript CLI that powers the Spotify liked songs workflow in this repository. The entrypoint at `src/spotify-flow/scripts/index.ts` coordinates exporting your saved tracks, enriching them with additional metadata, and producing a compact representation that is easy to share.

## Workflow Overview

1. **Load credentials from `.env`** -- The CLI reads Spotify credentials, page-limit hints, and optional refresh tokens from environment variables defined in `.env`.
2. **Create an authenticated client** -- `createClientFromEnv` validates the configuration and sets up a Spotify Web API client that can refresh access tokens when a stored refresh token is available.
3. **Export liked songs** -- The `--export` stage (which runs by default) pages through your saved tracks and writes a normalized JSON file to `outputs/spotify/my_liked_songs.json`.
4. **Enrich metadata** -- When run with `--enrich` or `--export-and-enrich`, the CLI fetches album, artist, and track details, then writes both enriched JSON and CSV outputs.
5. **Compact the dataset** -- The `--compact` action distills the enriched data into a lightweight JSON summary that keeps core identifiers, genres, release information, and Spotify URLs without redundant fields.

Unlike earlier iterations of this project, the current workflow does not download audio features; Spotify has deprecated that endpoint for new applications, so the exporter focuses on descriptive metadata instead.

## Preparing Environment Variables

Copy `.env.example` to `.env` and populate the required values:

```bash
cp .env.example .env
```

Fill in the following entries:

| Variable | Description |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | The Client ID of your Spotify app from the [Developer Dashboard](https://developer.spotify.com/dashboard). |
| `SPOTIFY_CLIENT_SECRET` | The Client Secret of the same Spotify app. Keep this value private. |
| `SPOTIFY_REDIRECT_URI` | A redirect URI registered in your Spotify app settings. It must match exactly. |
| `SPOTIFY_AUTHORIZATION_CODE` | The short-lived code returned to your redirect URI after authorizing the app. Use it promptly; it expires quickly. |
| `SPOTIFY_REFRESH_TOKEN` (optional) | A reusable refresh token that the CLI stores locally after the first successful run. |
| `SPOTIFY_PAGE_LIMIT` (optional) | A positive number that limits how many pages of liked songs to request during the export step. |

> **Tip:** If you need a fresh authorization code, repeat the manual Authorization Code Flow: visit the authorization URL in your browser, log into Spotify, accept the permissions, and copy the `code` query parameter from the redirected URL.

## Installing Dependencies

Install project dependencies before running the CLI:

```bash
npm install
```

The repository already includes TypeScript, ESLint, and other tooling. No additional packages are required beyond those listed in `package.json`.

## Running the CLI

Use `npm start` to execute the CLI with different combinations of actions:

```bash
# Export liked songs to outputs/spotify/my_liked_songs.json (default action)
npm start

# Export and enrich liked songs in a single run
npm start -- --export-and-enrich

# Enrich an existing liked songs JSON file
npm start -- --enrich

# Enrich a custom liked songs JSON file
npm start -- --enrich --input ./path/to/liked.json

# Compact an enriched export into a lightweight summary
npm start -- --compact

# Compact a specific enriched JSON file
npm start -- --compact --input ./path/to/enriched.json
```

If you provide `--input`, pair it with either `--enrich` or `--compact`. The CLI validates this combination and throws an error when `--input` is supplied by itself.

Prefer a visual pass? Run `npm run spotify:server` and open the served URL. The browser UI exposes the same export, enrich, and compact actions, then refreshes the metrics and track grid automatically once the flow finishes.

## Output Files

After enrichment runs, the CLI writes multiple files under `outputs/spotify/`:

- `enriched_likes.json` -- Detailed per-track metadata including artists, albums, and Spotify URLs.
- `enriched_likes.csv` -- A tabular view of the enriched data, with semicolon-delimited artist and genre fields.
- `enriched_likes.compact.json` -- The compact representation that retains essential identifiers, release information, genres, and Spotify links.
- `my_liked_songs.json` -- Updated with the compact view for compatibility with prior workflows.

Use the `--compact` flag to regenerate the compact JSON whenever you tweak or review the enriched dataset.
