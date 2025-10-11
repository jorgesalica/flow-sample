import fetch from 'node-fetch';

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SAVED_TRACKS_ENDPOINT = 'https://api.spotify.com/v1/me/tracks';
const AUDIO_FEATURES_ENDPOINT = 'https://api.spotify.com/v1/audio-features';
const TRACKS_ENDPOINT = 'https://api.spotify.com/v1/tracks';
const ARTISTS_ENDPOINT = 'https://api.spotify.com/v1/artists';
const ALBUMS_ENDPOINT = 'https://api.spotify.com/v1/albums';

const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 500;

export interface SpotifyClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SpotifyTokenPair {
  accessToken: string;
  refreshToken: string | null;
}

export interface AudioFeaturesResult {
  featuresById: Map<string, any>;
  skippedTracks: { track_id: string; status?: number; error: string }[];
}

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: URLSearchParams | undefined;
  headers?: Record<string, string>;
}

interface RetryOptions {
  maxAttempts?: number;
  label?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry<T = any>(
  url: string,
  token: string | null,
  options: FetchOptions = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = DEFAULT_MAX_ATTEMPTS, label = url } = retryOptions;
  let attempt = 1;
  let lastError: Error | null = null;

  while (attempt <= maxAttempts) {
    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        body: options.body,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
        const retryDelayMs = Number.isFinite(retryAfterSeconds)
          ? Math.max(retryAfterSeconds as number, 1) * 1000
          : BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
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
        (error as any).status = response.status;
        (error as any).body = errorBody;
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error as Error;
      const status = (error as any).status as number | undefined;
      if (attempt >= maxAttempts || (status && status >= 400 && status !== 429)) {
        throw error;
      }
      const fallbackDelay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
      await sleep(fallbackDelay);
      attempt += 1;
    }
  }

  throw lastError ?? new Error(`Request failed (${url}).`);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export interface SpotifyClient {
  exchangeAuthorizationCode(code: string): Promise<SpotifyTokenPair>;
  requestClientCredentialsToken(): Promise<string>;
  refreshAccessToken(refreshToken: string): Promise<SpotifyTokenPair>;
  fetchAllSavedTracks(accessToken: string, options?: { pageLimit?: number }): Promise<any[]>;
  fetchAudioFeatures(trackIds: string[], tokens: { primary: string | null; fallback: string | null }): Promise<AudioFeaturesResult>;
  fetchTracksDetails(trackIds: string[], accessToken: string, logProgress: (processed: number, total: number) => void): Promise<Map<string, any>>;
  fetchArtistsDetails(artistIds: string[], accessToken: string, logProgress: (processed: number, total: number) => void): Promise<Map<string, any>>;
  fetchAlbumsDetails(albumIds: string[], accessToken: string, logProgress: (processed: number, total: number) => void): Promise<Map<string, any>>;
}

export function createSpotifyClient(config: SpotifyClientConfig): SpotifyClient {
  const basicAuthorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;

  async function exchangeAuthorizationCode(code: string): Promise<SpotifyTokenPair> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
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

    const tokenData = (await response.json()) as any;
    if (!tokenData.access_token) {
      throw new Error('Access token missing in the response.');
    }

    return {
      accessToken: tokenData.access_token as string,
      refreshToken: (tokenData.refresh_token as string | null) ?? null,
    };
  }

  async function requestClientCredentialsToken(): Promise<string> {
    const body = new URLSearchParams({ grant_type: 'client_credentials' });

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

    const tokenData = (await response.json()) as any;
    if (!tokenData.access_token) {
      throw new Error('Client credentials access token missing in the response.');
    }

    return tokenData.access_token as string;
  }

  async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenPair> {
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

    const tokenData = (await response.json()) as any;
    if (!tokenData.access_token) {
      throw new Error('Access token missing in refresh response.');
    }

    return {
      accessToken: tokenData.access_token as string,
      refreshToken: (tokenData.refresh_token as string | null) ?? refreshToken,
    };
  }

  async function fetchAllSavedTracks(accessToken: string, options: { pageLimit?: number } = {}): Promise<any[]> {
    const { pageLimit = Number.POSITIVE_INFINITY } = options;
    let nextUrl: string | null = `${SAVED_TRACKS_ENDPOINT}?limit=50&offset=0`;
    const savedTracks: any[] = [];
    let page = 1;

    while (nextUrl) {
      console.log(`Fetching saved tracks page ${page}...`);
      const data: any = await fetchJsonWithRetry<any>(nextUrl, accessToken, {}, { label: `${SAVED_TRACKS_ENDPOINT} page ${page}` });
      savedTracks.push(...(Array.isArray(data.items) ? data.items : []));

      nextUrl = data.next ?? null;
      page += 1;

      if (page > pageLimit) {
        console.log(`Page limit reached (${pageLimit}). Stopping pagination early.`);
        break;
      }
    }

    console.log(`Fetched ${savedTracks.length} saved tracks.`);
    return savedTracks;
  }

  async function fetchAudioFeatures(
    trackIds: string[],
    tokens: { primary: string | null; fallback: string | null }
  ): Promise<AudioFeaturesResult> {
    const featuresById = new Map<string, any>();
    const skipped: { track_id: string; status?: number; error: string }[] = [];

    const attemptRequest = async (ids: string[], token: string | null) => {
      if (!token) {
        const missingTokenError: any = new Error('No token provided for audio features request.');
        missingTokenError.status = 401;
        throw missingTokenError;
      }
      const idsParam = ids.join(',');
      const url = `${AUDIO_FEATURES_ENDPOINT}?ids=${encodeURIComponent(idsParam)}`;
      return fetchJsonWithRetry<any>(url, token, {}, { label: `${AUDIO_FEATURES_ENDPOINT}?ids` });
    };

    const tokensToUse = [tokens.primary, tokens.fallback].filter(Boolean) as string[];

    const handleChunkFailure = async (chunk: string[], lastError: any) => {
      if (chunk.length === 0) return;
      if (chunk.length === 1) {
        skipped.push({
          track_id: chunk[0],
          status: lastError?.status,
          error: lastError?.body || lastError?.message || 'Unknown error',
        });
        return;
      }

      for (const trackId of chunk) {
        let added = false;
        let finalError: any = null;

        for (const token of tokensToUse) {
          try {
            const singleData = await attemptRequest([trackId], token);
            if (Array.isArray(singleData.audio_features)) {
              singleData.audio_features.forEach((feature: any) => {
                if (feature?.id) {
                  featuresById.set(feature.id, feature);
                }
              });
            }
            added = true;
            break;
          } catch (error) {
            finalError = error;
            const status = (error as any).status as number | undefined;
            if (!status || (status !== 403 && status !== 404 && status !== 400)) {
              throw error;
            }
          }
        }

        if (!added) {
          skipped.push({
            track_id: trackId,
            status: finalError?.status,
            error: finalError?.body || finalError?.message || 'Unknown error',
          });
        }
      }
    };

    for (let i = 0; i < trackIds.length; i += 100) {
      const chunk = trackIds.slice(i, i + 100).filter(Boolean);
      if (chunk.length === 0) continue;

      let chunkHandled = false;
      let lastError: any = null;

      for (const token of tokensToUse) {
        try {
          const data = await attemptRequest(chunk, token);
          if (Array.isArray(data.audio_features)) {
            data.audio_features.forEach((feature: any) => {
              if (feature?.id) {
                featuresById.set(feature.id, feature);
              }
            });
          }
          chunkHandled = true;
          break;
        } catch (error) {
          const status = (error as any).status as number | undefined;
          if (status && [403, 404, 400].includes(status)) {
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

    return { featuresById, skippedTracks: skipped };
  }

  async function fetchTracksDetails(
    trackIds: string[],
    accessToken: string,
    logProgress: (processed: number, total: number) => void
  ): Promise<Map<string, any>> {
    const uniqueIds = Array.from(new Set(trackIds.filter(Boolean)));
    const chunks = chunkArray(uniqueIds, MAX_BATCH_SIZE);
    const detailsById = new Map<string, any>();
    let processed = 0;

    for (const chunk of chunks) {
      const url = `${TRACKS_ENDPOINT}?ids=${chunk.join(',')}`;
      const data: any = await fetchJsonWithRetry<any>(url, accessToken, {}, { label: `${TRACKS_ENDPOINT}?ids` });
      if (Array.isArray(data.tracks)) {
        data.tracks.forEach((track: any) => {
          if (track?.id) {
            detailsById.set(track.id, track);
          }
        });
      }
      processed += chunk.length;
      logProgress(processed, uniqueIds.length);
    }

    return detailsById;
  }

  async function fetchArtistsDetails(
    artistIds: string[],
    accessToken: string,
    logProgress: (processed: number, total: number) => void
  ): Promise<Map<string, any>> {
    const uniqueIds = Array.from(new Set(artistIds.filter(Boolean)));
    const chunks = chunkArray(uniqueIds, MAX_BATCH_SIZE);
    const detailsById = new Map<string, any>();
    let processed = 0;

    for (const chunk of chunks) {
      const url = `${ARTISTS_ENDPOINT}?ids=${chunk.join(',')}`;
      const data: any = await fetchJsonWithRetry<any>(url, accessToken, {}, { label: `${ARTISTS_ENDPOINT}?ids` });
      if (Array.isArray(data.artists)) {
        data.artists.forEach((artist: any) => {
          if (artist?.id) {
            detailsById.set(artist.id, artist);
          }
        });
      }
      processed += chunk.length;
      logProgress(processed, uniqueIds.length);
    }

    return detailsById;
  }

  async function fetchAlbumsDetails(
    albumIds: string[],
    accessToken: string,
    logProgress: (processed: number, total: number) => void
  ): Promise<Map<string, any>> {
    const uniqueIds = Array.from(new Set(albumIds.filter(Boolean)));
    const chunks = chunkArray(uniqueIds, MAX_BATCH_SIZE);
    const detailsById = new Map<string, any>();
    let processed = 0;

    for (const chunk of chunks) {
      const url = `${ALBUMS_ENDPOINT}?ids=${chunk.join(',')}`;
      const data: any = await fetchJsonWithRetry<any>(url, accessToken, {}, { label: `${ALBUMS_ENDPOINT}?ids` });
      if (Array.isArray(data.albums)) {
        data.albums.forEach((album: any) => {
          if (album?.id) {
            detailsById.set(album.id, album);
          }
        });
      }
      processed += chunk.length;
      logProgress(processed, uniqueIds.length);
    }

    return detailsById;
  }

  return {
    exchangeAuthorizationCode,
    requestClientCredentialsToken,
    refreshAccessToken,
    fetchAllSavedTracks,
    fetchAudioFeatures,
    fetchTracksDetails,
    fetchArtistsDetails,
    fetchAlbumsDetails,
  };
}
