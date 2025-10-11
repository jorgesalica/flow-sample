const fetch = require('node-fetch');

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SAVED_TRACKS_ENDPOINT = 'https://api.spotify.com/v1/me/tracks';
const AUDIO_FEATURES_ENDPOINT = 'https://api.spotify.com/v1/audio-features';
const TRACKS_ENDPOINT = 'https://api.spotify.com/v1/tracks';
const ARTISTS_ENDPOINT = 'https://api.spotify.com/v1/artists';
const ALBUMS_ENDPOINT = 'https://api.spotify.com/v1/albums';

const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchJsonWithRetry(url, token, { method = 'GET', body = undefined, headers = {} } = {}, options = {}) {
  const { maxAttempts = DEFAULT_MAX_ATTEMPTS, label = url } = options;
  let attempt = 1;
  let lastError = null;

  while (attempt <= maxAttempts) {
    try {
      const response = await fetch(url, {
        method,
        body,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
        const retryDelayMs = Number.isFinite(retryAfterSeconds)
          ? Math.max(retryAfterSeconds, 1) * 1000
          : (BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        await sleep(retryDelayMs);
        attempt += 1;
        continue;
      }

      if (response.status >= 500 && response.status < 600) {
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(`Request failed (${label}). Status: ${response.status}. Body: ${errorBody}`);
        error.status = response.status;
        error.body = errorBody;
        throw error;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || (error.status && error.status >= 400 && error.status !== 429)) {
        throw error;
      }
      const fallbackDelay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
      await sleep(fallbackDelay);
      attempt += 1;
    }
  }

  throw lastError || new Error(`Request failed (${label}).`);
}

function createSpotifyClient({ clientId, clientSecret, redirectUri }) {
  if (!clientId || !clientSecret) {
    throw new Error('Spotify client requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }

  const basicAuthorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  async function exchangeAuthorizationCode(authorizationCode) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: redirectUri,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: basicAuthorization,
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

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
    };
  }

  async function requestClientCredentialsToken() {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: basicAuthorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to request client credentials token. Status: ${response.status}. Body: ${errorBody}`);
    }

    const tokenData = await response.json();
    if (!tokenData.access_token) {
      throw new Error('Client credentials access token missing in the response.');
    }

    return tokenData.access_token;
  }

  async function refreshAccessToken(refreshToken) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: basicAuthorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to refresh access token. Status: ${response.status}. Body: ${errorBody}`);
    }

    const tokenData = await response.json();
    if (!tokenData.access_token) {
      throw new Error('Access token missing in refresh response.');
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
    };
  }

  async function fetchAllSavedTracks(accessToken, { pageLimit = Infinity } = {}) {
    let nextUrl = `${SAVED_TRACKS_ENDPOINT}?limit=50&offset=0`;
    const savedTracks = [];
    let page = 1;

    while (nextUrl) {
      console.log(`Fetching saved tracks page ${page}...`);

      const data = await fetchJsonWithRetry(nextUrl, accessToken, {}, { label: `${SAVED_TRACKS_ENDPOINT} page ${page}` });
      savedTracks.push(...(data.items || []));

      nextUrl = data.next;
      page += 1;

      if (page > pageLimit) {
        console.log(`Page limit reached (${pageLimit}). Stopping pagination early for testing.`);
        break;
      }
    }

    console.log(`Fetched ${savedTracks.length} saved tracks.`);
    return savedTracks;
  }

  async function fetchAudioFeatures(trackIds, { primaryToken, fallbackToken } = {}) {
    const chunkSize = 100;
    const featuresById = new Map();
    const skipped = [];

    const attemptRequest = async (ids, token) => {
      if (!token) {
        const missingTokenError = new Error('No token provided for audio features request.');
        missingTokenError.status = 401;
        throw missingTokenError;
      }

      const idsParam = Array.isArray(ids) ? ids.join(',') : ids;
      const url = `${AUDIO_FEATURES_ENDPOINT}?ids=${encodeURIComponent(idsParam)}`;
      return fetchJsonWithRetry(url, token, {}, { label: `${AUDIO_FEATURES_ENDPOINT}?ids` });
    };

    const tokens = [primaryToken];
    if (fallbackToken && fallbackToken !== primaryToken) {
      tokens.push(fallbackToken);
    }

    const handleChunkFailure = async (chunk, lastError) => {
      if (!chunk || chunk.length === 0) return;

      if (chunk.length === 1) {
        const trackId = chunk[0];
        skipped.push({
          track_id: trackId,
          status: lastError ? lastError.status : undefined,
          error: lastError ? lastError.body || lastError.message : 'Unknown error',
        });
        return;
      }

      for (const trackId of chunk) {
        let added = false;
        let finalError = null;

        for (const token of tokens) {
          try {
            const singleData = await attemptRequest([trackId], token);
            if (Array.isArray(singleData.audio_features)) {
              singleData.audio_features.forEach(feature => {
                if (feature && feature.id) {
                  featuresById.set(feature.id, feature);
                }
              });
            }
            added = true;
            break;
          } catch (error) {
            if (error.status === 403 || error.status === 404 || error.status === 400) {
              finalError = error;
              continue;
            }
            throw error;
          }
        }

        if (!added) {
          skipped.push({
            track_id: trackId,
            status: finalError ? finalError.status : undefined,
            error: finalError ? finalError.body || finalError.message : 'Unknown error',
          });
        }
      }
    };

    for (let i = 0; i < trackIds.length; i += chunkSize) {
      const chunk = trackIds.slice(i, i + chunkSize).filter(Boolean);
      if (chunk.length === 0) continue;

      let chunkHandled = false;
      let lastError = null;

      for (const token of tokens) {
        try {
          const data = await attemptRequest(chunk, token);
          if (Array.isArray(data.audio_features)) {
            data.audio_features.forEach(feature => {
              if (feature && feature.id) {
                featuresById.set(feature.id, feature);
              }
            });
          }
          chunkHandled = true;
          break;
        } catch (error) {
          if (error.status === 403 || error.status === 404 || error.status === 400) {
            lastError = error;
            continue;
          }
          throw error;
        }
      }

      if (!chunkHandled) {
        await handleChunkFailure(chunk, lastError);
      }
    }

    return {
      featuresById,
      skippedTracks: skipped,
    };
  }

  return {
    exchangeAuthorizationCode,
    requestClientCredentialsToken,
    refreshAccessToken,
    fetchAllSavedTracks,
    fetchAudioFeatures,
    async fetchTracksDetails(trackIds, accessToken, { logProgress = () => {} } = {}) {
      if (!Array.isArray(trackIds) || trackIds.length === 0) {
        return new Map();
      }

      const uniqueIds = Array.from(new Set(trackIds.filter(Boolean)));
      const chunks = chunkArray(uniqueIds, MAX_BATCH_SIZE);
      const detailsById = new Map();
      let processed = 0;

      for (const chunk of chunks) {
        const url = `${TRACKS_ENDPOINT}?ids=${chunk.join(',')}`;
        const data = await fetchJsonWithRetry(url, accessToken, {}, { label: `${TRACKS_ENDPOINT}?ids` });
        if (Array.isArray(data.tracks)) {
          data.tracks.forEach(track => {
            if (track && track.id) {
              detailsById.set(track.id, track);
            }
          });
        }
        processed += chunk.length;
        logProgress(processed, uniqueIds.length);
      }

      return detailsById;
    },
    async fetchArtistsDetails(artistIds, accessToken, { logProgress = () => {} } = {}) {
      if (!Array.isArray(artistIds) || artistIds.length === 0) {
        return new Map();
      }

      const uniqueIds = Array.from(new Set(artistIds.filter(Boolean)));
      const chunks = chunkArray(uniqueIds, MAX_BATCH_SIZE);
      const detailsById = new Map();
      let processed = 0;

      for (const chunk of chunks) {
        const url = `${ARTISTS_ENDPOINT}?ids=${chunk.join(',')}`;
        const data = await fetchJsonWithRetry(url, accessToken, {}, { label: `${ARTISTS_ENDPOINT}?ids` });
        if (Array.isArray(data.artists)) {
          data.artists.forEach(artist => {
            if (artist && artist.id) {
              detailsById.set(artist.id, artist);
            }
          });
        }
        processed += chunk.length;
        logProgress(processed, uniqueIds.length);
      }

      return detailsById;
    },
    async fetchAlbumsDetails(albumIds, accessToken, { logProgress = () => {} } = {}) {
      if (!Array.isArray(albumIds) || albumIds.length === 0) {
        return new Map();
      }

      const uniqueIds = Array.from(new Set(albumIds.filter(Boolean)));
      const chunks = chunkArray(uniqueIds, MAX_BATCH_SIZE);
      const detailsById = new Map();
      let processed = 0;

      for (const chunk of chunks) {
        const url = `${ALBUMS_ENDPOINT}?ids=${chunk.join(',')}`;
        const data = await fetchJsonWithRetry(url, accessToken, {}, { label: `${ALBUMS_ENDPOINT}?ids` });
        if (Array.isArray(data.albums)) {
          data.albums.forEach(album => {
            if (album && album.id) {
              detailsById.set(album.id, album);
            }
          });
        }
        processed += chunk.length;
        logProgress(processed, uniqueIds.length);
      }

      return detailsById;
    },
  };
}

module.exports = {
  createSpotifyClient,
};
