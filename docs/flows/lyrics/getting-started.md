# Getting Started: Lyrics Flow

> **Purpose**: Technical guide to enable and use the Lyrics Flow feature.

---

## Prerequisites

Lyrics Flow depends on **Spotify Flow**. You must have:

1. ✅ Spotify Flow connected and synced
2. ✅ Tracks stored in `data/flow.db`

No additional API keys are required. LrcLib is free and open.

---

## How It Works

### Data Source: LrcLib

| Endpoint | Purpose |
|----------|---------|
| `GET /api/get` | Fetch lyrics by track signature |

**Parameters sent:**
- `track_name` — Track title
- `artist_name` — Primary artist
- `album_name` — Album title  
- `duration` — Track duration in seconds (±2s tolerance)

**Response:**
- `plainLyrics` — Plain text lyrics
- `syncedLyrics` — LRC format with timestamps (optional)
- `404` — Not found

---

## Database Schema

Lyrics are stored in a new table:

```sql
CREATE TABLE IF NOT EXISTS lyrics (
    track_id TEXT PRIMARY KEY,
    plain_lyrics TEXT,
    synced_lyrics TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'found' | 'not_found' | 'pending'
    fetched_at TEXT,
    FOREIGN KEY (track_id) REFERENCES tracks(id)
);
```

| Column | Description |
|--------|-------------|
| `track_id` | Foreign key to tracks table |
| `plain_lyrics` | Plain text lyrics |
| `synced_lyrics` | LRC format (timestamped) |
| `status` | `found`, `not_found`, or `pending` |
| `fetched_at` | Timestamp of last fetch attempt |

---

## UI Integration

### Per-Track Button

Location: **TrackCard component**

| State | Button | Action |
|-------|--------|--------|
| `pending` | "View Lyrics" | Fetch from LrcLib → Show modal |
| `found` | "View Lyrics" | Show cached lyrics |
| `not_found` | "No Lyrics" (disabled) | — |

### Batch Button

Location: **Near Sync button (Controls component)**

| Button | Action |
|--------|--------|
| "Fetch All Lyrics" | Process all tracks with `status = 'pending'` |

---

## API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/lyrics/:trackId` | Get lyrics for a track (fetches if pending) |
| `POST` | `/api/lyrics/fetch-all` | Batch fetch all pending lyrics |

---

## Tech Stack Addition

| Layer | Addition |
|-------|----------|
| **Backend** | `LrcLibAdapter` — HTTP client for LrcLib API |
| **Backend** | `LyricsRepository` — SQLite persistence |
| **Backend** | `lyrics.routes.ts` — API endpoints |
| **Frontend** | `LyricsModal.svelte` — Display component |
| **Frontend** | `lyricsStore.ts` — State management |

---

## Useful Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start full stack (includes lyrics endpoints) |
| `pnpm --filter @flows/backend test` | Run backend tests (includes lyrics tests) |
