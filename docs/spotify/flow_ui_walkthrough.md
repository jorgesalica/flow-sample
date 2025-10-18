# Spotify Flow UI Walkthrough

This vignette documents the lightweight UI and server that now sit beside the Spotify liked songs exporter. Use it whenever you want to drift through the library without reaching for the CLI.

## Launching the Server

The UI is served from the TypeScript entry point at `src/spotify-flow/server.ts`. It exposes:

- Static assets under `src/spotify-flow/ui/` (HTML, CSS, JavaScript).
- A JSON endpoint at `/api/spotify/run` that reuses the same export/enrich/compact logic as the CLI.

Start the server directly from the repo root:

```bash
npm run spotify:server
```

By default it binds to `http://127.0.0.1:4173`. Adjust `SPOTIFY_FLOW_HOST` and `SPOTIFY_FLOW_PORT` in your shell if you want a different origin.

## Opening the UI

With the server running, navigate to:

```
http://127.0.0.1:4173/src/spotify-flow/ui/
```

The UI autoloads any existing JSON exports under `outputs/spotify/` and presents three control panels:

1. **Latest exports selector** — pick between the compact, enriched, or auto-detected outputs.
2. **Quick actions** — load the latest export, copy the CLI command to your clipboard, or trigger a fresh export/enrich/compact run.
3. **Metrics + grid** — total tracks, unique artists, top genre, and a card list of tracks with era, genres, popularity, and “added” labels.

If you load the page before the server, the JavaScript will retry against the fallback origin (`http://127.0.0.1:4173`) as soon as the server comes online.

## Running the Flow from the Browser

Click **Run export + enrich** to invoke `/api/spotify/run`. The server performs the exact same steps as the CLI:

1. Load credentials from `.env`.
2. Refresh or exchange access tokens.
3. Export liked songs, enrich them, and compact the resulting dataset.

Once finished, the UI reloads the outputs and refreshes the metrics/grid automatically. All CLI logs are echoed to the server console, while the UI console records summary entries under `[spotify-flow-ui]`.

## When to Prefer the CLI

The server depends on `ts-node`, and the UI currently acts as a single-user dashboard. If you need to:

- Run the flow on a remote machine without a browser.
- Schedule exports or wire them into other tooling.
- Supply custom `--input` paths or tweak page limits.

…the CLI remains the more explicit path. The two share the same “runner”, so behaviour stays in sync whichever surface you choose.

## Future Ideas

This walkthrough merely captures the first iteration. Future explorations might include:

- Session summaries (“last run”, “tracks added in the run”).
- Visualizations of artist or genre clusters.
- Multi-user auth flows or OAuth device code support.
- Download buttons for `enriched_likes.csv` or `enriched_likes.compact.json`.

Until then, enjoy wandering through your saved tracks without leaving the browser.
