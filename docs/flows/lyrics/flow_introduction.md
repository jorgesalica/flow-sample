# The Lyrics Toolkit: What You Can Do

> **Purpose**: This document describes the *capabilities* of the Lyrics Flow — intentional lenses for enriching your music collection with the words behind the sound.

This flow extends Spotify Flow. It does not replace the sync; it enhances what's already there.

---

## 1. Summon on Demand (Individual Fetch)

You can request lyrics for any single track, exactly when you want them.

* **The Intent**: To give you control. Not every track needs lyrics. You choose which ones matter.
* **The Action**: Click "View Lyrics" on any track card. If lyrics aren't stored, the system fetches them from LrcLib.
* **The Result**: Lyrics appear and are persisted. Next time, they're instant — no fetch required.

---

## 2. Mark the Unreachable (Not Found)

When lyrics don't exist, the system tells you honestly.

* **The Intent**: To avoid endless hunting. Some tracks simply have no lyrics in the database.
* **The Action**: If LrcLib returns nothing, the track is marked "not found".
* **The Result**: You see a clear message. No false hope, no retries until you ask again.

---

## 3. Harvest Everything (Batch Fetch)

You can fetch lyrics for your entire collection in one sweep.

* **The Intent**: For completeness. When you want every track enriched without clicking one by one.
* **The Action**: Click "Fetch All Lyrics" (near the Sync button). The system processes all tracks without lyrics.
* **The Result**: Your collection is fully enriched — lyrics where available, "not found" where not. The hunt ends.

---

## 4. Read and Feel (View)

The lyrics are displayed alongside the track's identity.

* **The Intent**: To unite the words with the music. Title, artist, album — all present when you read.
* **The Result**: A complete experience. The lyrics are no longer orphans; they belong to the track.

---

## What This Flow Does NOT Do (Yet)

* ❌ **Search within lyrics** — Future feature
* ❌ **Sentiment analysis** — Future feature  
* ❌ **Synced lyrics (LRC)** — LrcLib supports it, but display is not implemented yet

---

## The Flow at a Glance

```text
Track exists (from Spotify Sync)
         │
         ├── [View Lyrics] → Fetch if needed → Persist → Display
         │
         └── [Fetch All Lyrics] → Batch process → Persist all
```

Each action is explicit. The system never fetches without being asked.
