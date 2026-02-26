# @flows/lyrics

Lyrics integration flow — fetches lyrics from [LRCLIB](https://lrclib.net) and stores them in SQLite.

## Architecture

```
adapter/    → LrcLib API client with concurrent batch fetcher
repository  → SQLite storage (lyrics status tracking)
routes      → Elysia API routes (/api/lyrics/*)
```

## Key Features

- Single track lyrics fetch by title + artist + album + duration
- **Concurrent batch fetching** — 10 parallel requests (configurable), with progress logging every 5%
- Status tracking: `pending` → `found` / `not_found`
- Retry support for individual tracks and bulk retry of failed ones
- Plain and synced (timestamped) lyrics support

## API Routes

| Method | Path | Description |
| :----- | :--- | :---------- |
| GET | `/api/lyrics/:trackId` | Get lyrics for a track |
| POST | `/api/lyrics/fetch-all` | Batch fetch pending lyrics |
| GET | `/api/lyrics/tracks` | Track list with lyrics status |
| GET | `/api/lyrics/stats` | Lyrics coverage stats |
