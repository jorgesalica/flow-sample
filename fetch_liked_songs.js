/**
 * Quick instructions:
 * 1. Register a Spotify app at https://developer.spotify.com/dashboard and copy the client ID and client secret.
 * 2. Generate an authorization code by visiting the authorization URL in your browser after setting the redirect URI in your Spotify app, then copy the code parameter from the redirected URL.
 * 3. Install dependencies with `npm install node-fetch` if needed, copy `.env.example` to `.env` next to this script, then run it with
 *    `node fetch_liked_songs.js`.
 *
 * Your `.env` file must define the following variables:
 *   SPOTIFY_CLIENT_ID=...
 *   SPOTIFY_CLIENT_SECRET=...
 *   SPOTIFY_REDIRECT_URI=...
 *   SPOTIFY_AUTHORIZATION_CODE=...
 */

const fetch = require('node-fetch');
const fs = require('fs');

const ENV_FILE = '.env';

function loadEnvVariables(filePath) {
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Unable to read ${filePath}. Make sure the file exists and includes SPOTIFY_CLIENT_ID, ` +
        'SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, and SPOTIFY_AUTHORIZATION_CODE.'
    );
  }

  const env = {};
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    env[key] = rest.join('=').trim();
  });

  return env;
}

const env = loadEnvVariables(ENV_FILE);

const CLIENT_ID = env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = env.SPOTIFY_REDIRECT_URI;
const AUTHORIZATION_CODE = env.SPOTIFY_AUTHORIZATION_CODE;

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SAVED_TRACKS_ENDPOINT = 'https://api.spotify.com/v1/me/tracks';
const AUDIO_FEATURES_ENDPOINT = 'https://api.spotify.com/v1/audio-features';
const OUTPUT_FILE = 'my_liked_songs.json';

async function exchangeAuthorizationCode() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !AUTHORIZATION_CODE) {
    throw new Error('Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, and SPOTIFY_AUTHORIZATION_CODE in your .env file.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: AUTHORIZATION_CODE,
    redirect_uri: REDIRECT_URI,
  });

  console.log('Exchanging authorization code for access token...');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to exchange authorization code. Status: ${response.status}. Body: ${errorBody}`);
  }

  const tokenData = await response.json();
  if (!tokenData.access_token) {
    throw new Error('Access token missing in the response.');
  }

  console.log('Access token acquired.');
  return tokenData.access_token;
}

async function fetchAllSavedTracks(accessToken) {
  let nextUrl = `${SAVED_TRACKS_ENDPOINT}?limit=50&offset=0`;
  const savedTracks = [];
  let page = 1;

  while (nextUrl) {
    console.log(`Fetching saved tracks page ${page}...`);

    const response = await fetch(nextUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch saved tracks. Status: ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();
    savedTracks.push(...(data.items || []));

    nextUrl = data.next;
    page += 1;
  }

  console.log(`Fetched ${savedTracks.length} saved tracks.`);
  return savedTracks;
}

async function fetchAudioFeatures(accessToken, trackIds) {
  const featuresById = new Map();
  const chunkSize = 100;

  for (let i = 0; i < trackIds.length; i += chunkSize) {
    const chunk = trackIds.slice(i, i + chunkSize).filter(Boolean);
    if (chunk.length === 0) continue;

    console.log(`Fetching audio features for tracks ${i + 1}-${i + chunk.length} of ${trackIds.length}...`);

    const url = `${AUDIO_FEATURES_ENDPOINT}?ids=${encodeURIComponent(chunk.join(','))}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch audio features. Status: ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();
    if (Array.isArray(data.audio_features)) {
      data.audio_features.forEach(feature => {
        if (feature && feature.id) {
          featuresById.set(feature.id, feature);
        }
      });
    }
  }

  return featuresById;
}

function formatTrackRecord(item, audioFeaturesMap) {
  const track = item.track;
  if (!track) return null;

  const features = audioFeaturesMap.get(track.id) || {};
  return {
    track_name: track.name || '',
    artists: (track.artists || []).map(artist => artist.name).join(', '),
    added_at: item.added_at || '',
    valence: features.valence ?? null,
    energy: features.energy ?? null,
    danceability: features.danceability ?? null,
    tempo: features.tempo ?? null,
  };
}

async function main() {
  try {
    const accessToken = await exchangeAuthorizationCode();
    const savedTracks = await fetchAllSavedTracks(accessToken);
    const trackIds = savedTracks
      .map(item => item.track && item.track.id)
      .filter(Boolean);

    const audioFeaturesMap = await fetchAudioFeatures(accessToken, trackIds);

    console.log('Combining track metadata with audio features...');
    const formatted = savedTracks
      .map(item => formatTrackRecord(item, audioFeaturesMap))
      .filter(Boolean);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(formatted, null, 2));
    console.log(`Saved ${formatted.length} records to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

main();
