/**
 * Spotify liked songs exporter and enricher.
 *
 * Usage:
 *   node fetch_liked_songs.js                -> export liked songs (existing behaviour)
 *   node fetch_liked_songs.js --enrich       -> enrich an existing my_liked_songs.json
 *   node fetch_liked_songs.js --export-and-enrich
 *                                            -> export and then enrich in one run
 *   node fetch_liked_songs.js --enrich --input ./custom.json
 *                                            -> enrich a custom JSON file
 */

const fs = require('fs');
const path = require('path');

const { loadEnvVariables } = require('./lib/env');
const { loadStoredRefreshToken, persistRefreshToken } = require('./lib/tokenStore');
const { createSpotifyClient } = require('./lib/spotifyClient');

const ENV_FILE = '.env';
const OUTPUT_FILE = 'my_liked_songs.json';
const TOKENS_FILE = 'spotify_tokens.json';
const SKIPPED_FEATURES_FILE = 'spotify_skipped_audio_features.json';
const ENRICHED_JSON_FILE = 'enriched_likes.json';
const ENRICHED_CSV_FILE = 'enriched_likes.csv';

const SUPPORTED_AUDIO_FEATURE_MODES = new Set(['none', 'user', 'client']);

function ensureTrimmed(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadJsonFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON root must be an array.');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Unable to parse ${absolutePath}: ${error.message}`);
  }
}

function parseArgs(argv) {
  const options = {
    mode: 'export',
    inputPath: OUTPUT_FILE,
    inputProvided: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--enrich') {
      options.mode = options.mode === 'export-and-enrich' ? 'export-and-enrich' : 'enrich';
    } else if (arg === '--export-and-enrich') {
      options.mode = 'export-and-enrich';
    } else if (arg === '--input') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Expected a file path after --input.');
      }
      options.inputPath = next;
      options.inputProvided = true;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.mode = 'help';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node fetch_liked_songs.js [options]

Options:
  --enrich                 Enrich an existing JSON export (defaults to ${OUTPUT_FILE}).
  --export-and-enrich      Export liked songs and enrich them in a single run.
  --input <path>           Custom input JSON to enrich (requires --enrich).
  --help                   Show this message.
`);
}

function validateAudioMode(mode) {
  const normalized = (mode || 'user').toLowerCase();
  if (!SUPPORTED_AUDIO_FEATURE_MODES.has(normalized)) {
    throw new Error(
      `Unsupported SPOTIFY_AUDIO_FEATURES_MODE value "${mode}". Valid options: none, user, client.`
    );
  }
  return normalized;
}

function parsePageLimit(rawPageLimit) {
  if (!rawPageLimit) return undefined;
  const parsedLimit = Number(rawPageLimit);
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    throw new Error('SPOTIFY_PAGE_LIMIT must be a positive number if provided.');
  }
  return Math.floor(parsedLimit);
}

function formatTrackRecord(item, audioFeaturesMap) {
  const track = item.track;
  if (!track || !track.id) return null;

  const artistEntries = Array.isArray(track.artists)
    ? track.artists.map(artist => ({
        id: artist?.id || null,
        name: artist?.name || '',
      }))
    : [];

  const features = audioFeaturesMap.get(track.id) || {};

  return {
    track_id: track.id,
    track_name: track.name || '',
    artists: artistEntries.map(artist => artist.name).join(', '),
    artist_ids: artistEntries.map(artist => artist.id).filter(Boolean),
    artists_list: artistEntries,
    added_at: item.added_at || '',
    valence: features.valence ?? null,
    energy: features.energy ?? null,
    danceability: features.danceability ?? null,
    tempo: features.tempo ?? null,
  };
}

function ensureTrackIds(records) {
  const missingIds = records.filter(record => !record.track_id);
  if (missingIds.length > 0) {
    throw new Error(
      'Input JSON is missing track_id values. Please re-export liked songs with the latest script before enriching.'
    );
  }
}

function buildArtistGenresUnion(artistDetails, artistIds) {
  const genres = new Set();
  artistIds.forEach(id => {
    const artist = artistDetails.get(id);
    if (artist && Array.isArray(artist.genres)) {
      artist.genres.forEach(genre => {
        if (genre) genres.add(genre);
      });
    }
  });
  return Array.from(genres);
}

function buildCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildCsvContent(records) {
  const headers = [
    'track_id',
    'track_name',
    'artists_joined',
    'added_at',
    'year',
    'duration_ms',
    'explicit',
    'popularity',
    'preview_url',
    'album_name',
    'album_release_date',
    'album_type',
    'artist_genres_joined',
    'markets_count',
    'isrc',
    'track_spotify_url',
    'album_spotify_url',
  ];

  const rows = records.map(record => {
    return headers
      .map(header => {
        switch (header) {
          case 'track_id':
            return buildCsvValue(record.track_id);
          case 'track_name':
            return buildCsvValue(record.track_name);
          case 'artists_joined':
            return buildCsvValue(record.artists_joined || '');
          case 'added_at':
            return buildCsvValue(record.added_at || '');
          case 'year':
            return buildCsvValue(record.year || '');
          case 'duration_ms':
            return buildCsvValue(record.duration_ms ?? '');
          case 'explicit':
            return buildCsvValue(record.explicit ?? false);
          case 'popularity':
            return buildCsvValue(record.popularity ?? '');
          case 'preview_url':
            return buildCsvValue(record.preview_url || '');
          case 'album_name':
            return buildCsvValue(record.album?.name || '');
          case 'album_release_date':
            return buildCsvValue(record.album?.release_date || '');
          case 'album_type':
            return buildCsvValue(record.album?.album_type || '');
          case 'artist_genres_joined':
            return buildCsvValue(record.artist_genres_joined || '');
          case 'markets_count':
            return buildCsvValue(record.markets_count ?? '');
          case 'isrc':
            return buildCsvValue(record.external_ids?.isrc || '');
          case 'track_spotify_url':
            return buildCsvValue(record.external_urls?.spotify || '');
          case 'album_spotify_url':
            return buildCsvValue(record.album?.external_urls?.spotify || '');
          default:
            return '';
        }
      })
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

async function authenticate(env, spotifyClient) {
  const clientId = ensureTrimmed(env.SPOTIFY_CLIENT_ID);
  const clientSecret = ensureTrimmed(env.SPOTIFY_CLIENT_SECRET);
  const redirectUri = ensureTrimmed(env.SPOTIFY_REDIRECT_URI);
  const authorizationCode = ensureTrimmed(env.SPOTIFY_AUTHORIZATION_CODE);
  const envRefreshToken = ensureTrimmed(env.SPOTIFY_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in your .env file.');
  }

  const storedRefreshToken = loadStoredRefreshToken(TOKENS_FILE) || envRefreshToken;
  let authTokens = null;

  if (storedRefreshToken) {
    try {
      authTokens = await spotifyClient.refreshAccessToken(storedRefreshToken);
      console.log('Access token refreshed using stored refresh token.');
    } catch (refreshError) {
      console.warn(`Warning: refresh flow failed (${refreshError.message}). Falling back to authorization code.`);
    }
  }

  if (!authTokens) {
    if (!authorizationCode) {
      throw new Error('No stored refresh token found. Please set SPOTIFY_AUTHORIZATION_CODE with a fresh authorization code.');
    }

    console.log('Exchanging authorization code for access token...');
    authTokens = await spotifyClient.exchangeAuthorizationCode(authorizationCode);
    console.log('Access token acquired.');
  }

  const accessToken = authTokens.accessToken;
  const refreshToken = ensureTrimmed(authTokens.refreshToken);

  if (refreshToken) {
    persistRefreshToken(TOKENS_FILE, refreshToken);
  } else {
    console.warn('Warning: no refresh token returned by Spotify. You may need a new authorization code next time.');
  }

  return { accessToken, refreshToken };
}

async function exportLikedSongs({
  spotifyClient,
  accessToken,
  audioMode,
  pageLimit,
}) {
  const savedTracks = await spotifyClient.fetchAllSavedTracks(accessToken, pageLimit ? { pageLimit } : {});
  const trackIds = savedTracks
    .map(item => (item.track && item.track.id ? item.track.id : null))
    .filter(Boolean);

  let featuresById = new Map();
  let skippedTracks = [];

  if (audioMode === 'none') {
    featuresById = new Map();
    skippedTracks = trackIds.map(trackId => ({
      track_id: trackId,
      status: 0,
      error: 'Audio features intentionally skipped (SPOTIFY_AUDIO_FEATURES_MODE=none)',
    }));
  } else {
    let primaryAudioToken = accessToken;
    let fallbackAudioToken = null;

    if (audioMode === 'client') {
      console.log('Audio features mode set to client. Requesting client credentials token...');
      const clientCredentialsToken = await spotifyClient.requestClientCredentialsToken();
      primaryAudioToken = clientCredentialsToken;
      fallbackAudioToken = accessToken;
    } else {
      console.log('Audio features mode set to user. Using user access token for audio features.');
    }

    const response = await spotifyClient.fetchAudioFeatures(trackIds, {
      primaryToken: primaryAudioToken,
      fallbackToken: fallbackAudioToken,
    });

    featuresById = response.featuresById;
    skippedTracks = response.skippedTracks;
  }

  console.log('Mapping saved tracks into export format...');
  const formatted = savedTracks
    .map(item => formatTrackRecord(item, featuresById))
    .filter(Boolean);

  writeJsonFile(OUTPUT_FILE, formatted);
  console.log(`Saved ${formatted.length} records to ${OUTPUT_FILE}`);

  if (skippedTracks.length > 0) {
    console.log('Writing skipped audio features JSON file...');
    writeJsonFile(SKIPPED_FEATURES_FILE, {
      generated_at: new Date().toISOString(),
      skipped: skippedTracks,
    });
    console.warn(
      `Warning: audio features were unavailable or skipped for ${skippedTracks.length} tracks. See ${SKIPPED_FEATURES_FILE} for details.`
    );
  } else if (fs.existsSync(SKIPPED_FEATURES_FILE)) {
    fs.unlinkSync(SKIPPED_FEATURES_FILE);
  }
}

async function enrichLikedSongs({
  spotifyClient,
  accessToken,
  inputPath,
}) {
  console.log(`Loading base liked songs from ${inputPath}...`);
  const baseRecords = loadJsonFile(inputPath);
  ensureTrackIds(baseRecords);

  const trackIds = baseRecords.map(record => record.track_id);
  console.log(`Enriching ${trackIds.length} tracks...`);

  const trackDetailsMap = await spotifyClient.fetchTracksDetails(trackIds, accessToken, {
    logProgress: (processed, total) => {
      if (processed === total || processed % 50 === 0) {
        console.log(`Fetched track details for ${processed}/${total} tracks...`);
      }
    },
  });

  const artistIdSet = new Set();
  const albumIdsNeedingDetails = new Set();

  trackIds.forEach(trackId => {
    const track = trackDetailsMap.get(trackId);
    if (track && Array.isArray(track.artists)) {
      track.artists.forEach(artist => {
        if (artist && artist.id) {
          artistIdSet.add(artist.id);
        }
      });
    }

    if (track && track.album && track.album.id) {
      const album = track.album;
      const needsAlbumFetch = !album.release_date || !album.images || album.images.length === 0;
      if (needsAlbumFetch) {
        albumIdsNeedingDetails.add(album.id);
      }
    }
  });

  const artistDetailsMap = await spotifyClient.fetchArtistsDetails(Array.from(artistIdSet), accessToken, {
    logProgress: (processed, total) => {
      if (processed === total || processed % 50 === 0) {
        console.log(`Fetched artist details for ${processed}/${total} artists...`);
      }
    },
  });

  const albumDetailsMap = await spotifyClient.fetchAlbumsDetails(Array.from(albumIdsNeedingDetails), accessToken, {
    logProgress: (processed, total) => {
      if (processed === total || processed % 50 === 0) {
        console.log(`Fetched album details for ${processed}/${total} albums...`);
      }
    },
  });

  const enrichedRecords = baseRecords.map(record => {
    const track = trackDetailsMap.get(record.track_id);
    if (!track) {
      console.warn(`Warning: track details not found for track_id ${record.track_id}. Using fallback data from JSON.`);
    }
    const artists = track?.artists || [];
    const album = (() => {
      if (track && track.album) {
        const albumId = track.album.id;
        if (albumId && albumDetailsMap.has(albumId)) {
          return albumDetailsMap.get(albumId);
        }
        return track.album;
      }
      return null;
    })();

    const artistIds = artists.map(artist => artist?.id).filter(Boolean);
    const artistGenres = buildArtistGenresUnion(artistDetailsMap, artistIds);
    const artistGenresJoined = artistGenres.join('; ');

    const enriched = {
      track_id: record.track_id,
      track_name: track?.name || record.track_name || '',
      artists: artists.map(artist => ({ id: artist?.id || null, name: artist?.name || '' })),
      artists_joined: artists.map(artist => artist?.name || '').filter(Boolean).join('; '),
      added_at: record.added_at || '',
      duration_ms: track?.duration_ms ?? null,
      explicit: track?.explicit ?? false,
      popularity: track?.popularity ?? null,
      preview_url: track?.preview_url || null,
      available_markets: Array.isArray(track?.available_markets) ? track.available_markets : [],
      markets_count: Array.isArray(track?.available_markets) ? track.available_markets.length : null,
      external_ids: track?.external_ids || {},
      external_urls: track?.external_urls || {},
      album: album
        ? {
            id: album.id || null,
            name: album.name || '',
            release_date: album.release_date || null,
            release_date_precision: album.release_date_precision || null,
            total_tracks: album.total_tracks ?? null,
            album_type: album.album_type || null,
            images: Array.isArray(album.images) ? album.images : [],
            external_urls: album.external_urls || {},
          }
        : null,
      artistas_enriquecidos: artistIds.map(id => {
        const artist = artistDetailsMap.get(id);
        if (!artist) {
          return {
            id,
            name: artists.find(entry => entry.id === id)?.name || '',
            genres: [],
            popularity: null,
            followers: { total: null },
            external_urls: {},
          };
        }
        return {
          id: artist.id,
          name: artist.name || '',
          genres: Array.isArray(artist.genres) ? artist.genres : [],
          popularity: artist.popularity ?? null,
          followers: artist.followers || { total: null },
          external_urls: artist.external_urls || {},
        };
      }),
      year: album?.release_date ? album.release_date.slice(0, 4) : null,
      artist_genres_uniq: artistGenresJoined,
      artist_genres_joined: artistGenresJoined,
    };

    return enriched;
  });

  writeJsonFile(ENRICHED_JSON_FILE, enrichedRecords);
  console.log(`Saved enriched data to ${ENRICHED_JSON_FILE}`);

  const csvContent = buildCsvContent(enrichedRecords);
  fs.writeFileSync(ENRICHED_CSV_FILE, csvContent);
  console.log(`Saved enriched CSV to ${ENRICHED_CSV_FILE}`);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.mode === 'help') {
      printHelp();
      return;
    }

    if (args.inputProvided && args.mode === 'export') {
      throw new Error('--input can only be used together with --enrich or --export-and-enrich.');
    }

    const env = loadEnvVariables(ENV_FILE);
    const audioMode = validateAudioMode(ensureTrimmed(env.SPOTIFY_AUDIO_FEATURES_MODE) || 'user');
    const pageLimit = parsePageLimit(ensureTrimmed(env.SPOTIFY_PAGE_LIMIT));

    const spotifyClient = createSpotifyClient({
      clientId: ensureTrimmed(env.SPOTIFY_CLIENT_ID),
      clientSecret: ensureTrimmed(env.SPOTIFY_CLIENT_SECRET),
      redirectUri: ensureTrimmed(env.SPOTIFY_REDIRECT_URI),
    });

    const { accessToken } = await authenticate(env, spotifyClient);

    if (args.mode === 'export') {
      await exportLikedSongs({
        spotifyClient,
        accessToken,
        audioMode,
        pageLimit,
      });
      return;
    }

    if (args.mode === 'export-and-enrich') {
      await exportLikedSongs({
        spotifyClient,
        accessToken,
        audioMode,
        pageLimit,
      });
      await enrichLikedSongs({
        spotifyClient,
        accessToken,
        inputPath: args.inputPath || OUTPUT_FILE,
      });
      return;
    }

    if (args.mode === 'enrich') {
      await enrichLikedSongs({
        spotifyClient,
        accessToken,
        inputPath: args.inputPath || OUTPUT_FILE,
      });
      return;
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
    process.exitCode = 1;
  }
}

main();
