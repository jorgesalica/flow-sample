# @flows/spotify

Spotify integration flow: syncs liked tracks and enriches artist metadata. Shared track,
artist, genre, and FTS persistence is owned by `@flows/music`; Spotify owns OAuth, API
adaptation, synchronization, token cache, and provider-specific artist cache.

## Boundaries

```text
adapter/       Spotify Web API and OAuth
usecase.ts     sync and enrichment orchestration
spotify.service.ts  OAuth, sync, cache, query, and aggregate orchestration
routes.ts      HTTP validation, redirects, and error/status mapping
@flows/music   shared SQLite track persistence
```

Spotify does not own lyrics persistence and `@flows/music` does not know about Spotify's
API or credentials.

## API Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/spotify/tracks` | Complete track list |
| GET | `/api/spotify/tracks/search` | Paginated and filterable track search |
| GET | `/api/spotify/tracks/:id` | Track lookup (`404` when absent) |
| GET | `/api/spotify/count` | Track count |
| GET | `/api/spotify/genres` | Genre counts |
| GET | `/api/spotify/years` | Year distribution |
| GET | `/api/spotify/stats` | Library stats |
| POST | `/api/spotify/run` | Sync liked tracks from Spotify |
| GET | `/api/spotify/auth/login` | Start OAuth flow |
| GET | `/api/spotify/auth/callback` | OAuth callback |
| GET | `/api/spotify/auth/status` | Stored refresh-token status |

`createSpotifyRoutes(config, application)` and `createSpotifyService(config,
dependencies)` are injectable composition boundaries. Run
`pnpm --filter @flows/spotify test:coverage`; shared repository tests run under
`pnpm --filter @flows/music test`.
