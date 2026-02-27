# @flows/spotify

Spotify integration flow — syncs liked tracks, enriches artist metadata (genres, images), and stores everything in SQLite.

## Architecture

```text
adapter/    → Spotify Web API client (axios), OAuth2 auth flow
repository  → SQLite storage (tracks, artists, genres)
routes      → Elysia API routes (/api/spotify/*)
```

## Key Features

- OAuth2 authorization code flow with token refresh
- Paginated fetch of all liked tracks (up to 3000+)
- Batch artist enrichment (genres + images) in chunks of 50
- Full-text search via SQLite FTS5
- Genre/year filtering and sorting
- 5-minute response cache with manual invalidation

## API Routes

| Method | Path | Description |
| :----- | :--- | :---------- |
| GET | `/api/spotify/tracks` | Paginated track list |
| GET | `/api/spotify/genres` | Genre counts |
| GET | `/api/spotify/years` | Year distribution |
| GET | `/api/spotify/stats` | Library stats |
| POST | `/api/spotify/sync` | Full sync from Spotify |
| GET | `/api/spotify/auth/login` | Start OAuth flow |
| GET | `/api/spotify/auth/callback` | OAuth callback |
