# Spotify Liked Songs Export Flow

This document explains how the `fetch_liked_songs.js` script authenticates with the Spotify Web API using the Authorization Code Flow, gathers your saved tracks ("Liked Songs"), and stores the results locally. It also walks through the environment variables you must define before running the script.

## Overview of the Script

1. **Load credentials from `.env`** – The script reads Spotify credentials and the one-time authorization code from environment variables defined in a `.env` file that lives next to the script.
2. **Exchange the authorization code** – Using the `https://accounts.spotify.com/api/token` endpoint, the script swaps the authorization code for an access token (and, if provided by Spotify, a refresh token).
3. **Fetch saved tracks with pagination** – It repeatedly calls `https://api.spotify.com/v1/me/tracks` with a limit of 50 items per request until all saved tracks are retrieved.
4. **Request audio features in batches** – Track IDs are grouped into batches of up to 100 and sent to `https://api.spotify.com/v1/audio-features?ids={ids}` to obtain valence, energy, danceability, and tempo for each track.
5. **Combine and save** – Metadata from the saved tracks endpoint and audio features are merged and written to `my_liked_songs.json`.

Throughout the run, the script logs progress updates to the console so you can monitor pagination and audio feature downloads.

## Preparing the Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Then edit `.env` with the following entries:

| Variable | Description |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | The Client ID of your Spotify app from the [Developer Dashboard](https://developer.spotify.com/dashboard). |
| `SPOTIFY_CLIENT_SECRET` | The Client Secret of the same Spotify app. Keep this value private. |
| `SPOTIFY_REDIRECT_URI` | A redirect URI registered in your Spotify app settings. It must match exactly. |
| `SPOTIFY_AUTHORIZATION_CODE` | The short-lived code returned to your redirect URI after authorizing the app. Use it promptly; it expires quickly. |

> **Tip:** If you need a fresh authorization code, repeat the manual Authorization Code Flow: visit the authorization URL in your browser, log into Spotify, accept the permissions, and copy the `code` query parameter from the redirected URL.

## Running the Script End-to-End

1. Install dependencies if you have not already:
   ```bash
   npm install node-fetch
   ```
2. Ensure `.env` is populated with the values listed above.
3. Run the script:
   ```bash
   node fetch_liked_songs.js
   ```
4. Inspect the generated `my_liked_songs.json` file for the combined track metadata and audio features.

If the script reports missing environment variables or an error exchanging the authorization code, confirm that the `.env` values are present, spelled correctly, and correspond to the same Spotify app and redirect URI you used when generating the authorization code.
