# @flows/spotify

Spotify integration flow: syncs liked tracks and enriches artist metadata. Shared track,
artist, genre, and FTS persistence is owned by `@flows/music`; Spotify owns OAuth, API
adaptation, synchronization, token cache, and provider-specific artist cache.

## Boundaries

```text
adapter/       Spotify Web API and OAuth
usecase.ts     sync and enrichment orchestration
routes.ts      Elysia routes under /api/spotify
@flows/music   shared SQLite track persistence
```

Spotify does not own lyrics persistence and `@flows/music` does not know about Spotify's
API or credentials.

## API Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/spotify/tracks` | Paginated track list |
| GET | `/api/spotify/genres` | Genre counts |
| GET | `/api/spotify/years` | Year distribution |
| GET | `/api/spotify/stats` | Library stats |
| POST | `/api/spotify/sync` | Full sync from Spotify |
| GET | `/api/spotify/auth/login` | Start OAuth flow |
| GET | `/api/spotify/auth/callback` | OAuth callback |

Run `pnpm --filter @flows/spotify test`; shared repository tests run under
`pnpm --filter @flows/music test`.
