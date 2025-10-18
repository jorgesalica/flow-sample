# Spotify Flow Introduction

Welcome to the stream where playlists and curiosity meet. This corner of Flow Sample is a small field lab for living with your saved tracks—listening beyond the play count to notice how songs cluster, evolve, and return as companions. Nothing here aims to be definitive. Instead, the script moves in waves, trusting the process more than the outcome.

## The Drift

- **Gather the whispers:** Start by inviting the CLI to peek at your liked songs. It moves gently through your library, page by page, collecting titles like found objects on a shoreline.
- **Ask the rivers:** With that list in hand, the flow turns outward—checking in with albums, artists, and dates. It’s less about proving anything and more about understanding who surrounds each song.
- **Bottle the tide:** Every pass leaves a few gifts in `outputs/spotify/`: a richly detailed JSON, a spreadsheet-ready CSV, and a compact bundle that keeps only what matters most for retelling the story elsewhere.
- **Let it settle:** No dashboards, no mandates. Just artifacts ready for the next improvisation—maybe a zine, maybe a map, maybe a question you haven’t framed yet.

## How to Approach It

1. **Set the stage:** Copy `.env.example` to `.env`, fill in your Spotify credentials, and keep them close. They are simply keys to your own archive.
2. **Follow the script (or don’t):** `npm start` runs the default export. Add `--export-and-enrich`, `--enrich`, or `--compact` when you want a different cadence. Mix and match to taste.
3. **Read the artifacts:** Explore the outputs. Notice which fields feel resonant, which seem redundant, and which might hint at a story you want to chase later.

This documentation doesn’t prescribe the experience; it frames an attitude. Treat the CLI as a traveling companion—curious, respectful, and ready to drift with whatever music you’ve been gathering. When you find a new narrative, document it, remix it, or simply let it flow back into the repository for someone else to encounter.
