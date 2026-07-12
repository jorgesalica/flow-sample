# @flows/music

Neutral music-domain persistence shared by Spotify and Lyrics.

## Owns

- The `music.db` connection and compatible schema initialization.
- Track, artist, genre, and full-text-search persistence.
- `SQLiteTrackRepository` and its query/pagination contracts.

## Does Not Own

- Spotify OAuth, API adaptation, synchronization, token cache, or artist API cache.
- LrcLib adaptation or lyrics orchestration.
- UI/API DTO definitions, which remain in `@flows/shared`.

The package is an in-process workspace boundary, not a deployable service. Consumers use
its public `src/index.ts` exports and must not import internal files.
