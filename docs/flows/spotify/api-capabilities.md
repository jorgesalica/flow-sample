# Spotify Web API — Available Capabilities (Post Feb 2026)

> Reference of what the Spotify API allows in Development Mode after the [February 2026 changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026).
> Premium account required. Max 5 authorized users per Client ID.

---

## Library

| Action | Endpoint | Status |
|--------|----------|:------:|
| Get Liked Songs | `GET /me/tracks` | ✅ Used |
| Get Saved Albums | `GET /me/albums` | Available |
| Get My Playlists | `GET /me/playlists` | Available |
| Get Followed Artists | `GET /me/following` | Available |
| Save items (any type) | `PUT /me/library` | Available |
| Remove items | `DELETE /me/library` | Available |
| Check if saved | `GET /me/library/contains` | Available |

## Playlists (Full CRUD)

| Action | Endpoint |
|--------|----------|
| Create playlist | `POST /me/playlists` |
| Get playlist details | `GET /playlists/{id}` |
| Get playlist items | `GET /playlists/{id}/items` |
| Add items | `POST /playlists/{id}/items` |
| Remove items | `DELETE /playlists/{id}/items` |
| Reorder items | `PUT /playlists/{id}/items` |
| Edit name/description | `PUT /playlists/{id}` |
| Get/upload cover image | `GET/PUT /playlists/{id}/images` |

## Metadata (Individual only)

| Action | Endpoint | Status |
|--------|----------|:------:|
| Get artist (w/ genres) | `GET /artists/{id}` | ✅ Used (cached) |
| Get artist albums | `GET /artists/{id}/albums` | Available |
| Get album | `GET /albums/{id}` | Available |
| Get album tracks | `GET /albums/{id}/tracks` | Available |
| Get track | `GET /tracks/{id}` | Available |
| Search | `GET /search` (max 10/page) | Available |

> **Note:** All batch endpoints (`GET /artists`, `GET /tracks`, etc.) were removed. Use individual endpoints.

## Player (Playback Control)

| Action | Endpoint |
|--------|----------|
| Playback state | `GET /me/player` |
| Currently playing | `GET /me/player/currently-playing` |
| Recently played | `GET /me/player/recently-played` |
| Play / Pause | `PUT .../play`, `PUT .../pause` |
| Next / Previous | `POST .../next`, `POST .../previous` |
| Add to queue | `POST /me/player/queue` |
| View queue | `GET /me/player/queue` |
| Volume / Shuffle / Repeat / Seek | `PUT .../volume`, `shuffle`, `repeat`, `seek` |
| Available devices | `GET /me/player/devices` |
| Transfer playback | `PUT /me/player` |

## User & Personalization

| Action | Endpoint |
|--------|----------|
| My profile | `GET /me` |
| Top artists/tracks (by period) | `GET /me/top/{type}` |

---

## Removed (Do Not Use)

- All batch endpoints (`GET /artists`, `GET /tracks`, `GET /albums`, etc.)
- `GET /artists/{id}/top-tracks`
- `GET /browse/*` (categories, new releases)
- `GET /users/{id}` (other users' profiles/playlists)
- Fields: `popularity`, `followers` (artist), `available_markets`, `external_ids`, `linked_from`

---

## Feature Ideas

1. **Auto-curated playlists** — Use cached genre data to group liked songs into playlists
2. **Top Artists dashboard** — `GET /me/top/{type}` with `short_term`, `medium_term`, `long_term`
3. **Now Playing widget** — Real-time display via `GET /me/player/currently-playing`
4. **Listening history** — `GET /me/player/recently-played` for pattern tracking
5. **Smart search + playlist builder** — Search → curate → create playlist
