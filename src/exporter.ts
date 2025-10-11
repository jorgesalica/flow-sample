import fs from 'fs';

import { FILES, SPOTIFY_OUTPUT_DIR } from './config';
import type { EnrichedTrackRecord, LikedTrackRecord } from './types';
import { loadStoredRefreshToken, persistRefreshToken } from './tokenStore';
import type { SpotifyClient } from './spotifyClient';
import { createSpotifyClient } from './spotifyClient';
import { loadEnvVariables, RawEnv } from './env';
import {
  buildArtistGenresUnion,
  buildCsvContent,
  buildVersionFlags,
  ensureDirectoryExists,
  ensureTrimmed,
  loadJsonFile,
  selectAlbumImageUrl,
  writeJsonFile,
  writeTextFile,
} from './utils';

interface AuthenticateResult {
  accessToken: string;
  refreshToken: string | null;
}

export function parsePageLimit(rawPageLimit: string | undefined): number | undefined {
  if (!rawPageLimit) return undefined;
  const parsedLimit = Number(rawPageLimit);
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    throw new Error('SPOTIFY_PAGE_LIMIT must be a positive number if provided.');
  }
  return Math.floor(parsedLimit);
}

export function createClientFromEnv(): {
  client: SpotifyClient;
  env: RawEnv;
} {
  const env = loadEnvVariables();
  const clientId = ensureTrimmed(env.SPOTIFY_CLIENT_ID);
  const clientSecret = ensureTrimmed(env.SPOTIFY_CLIENT_SECRET);
  const redirectUri = ensureTrimmed(env.SPOTIFY_REDIRECT_URI);

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI in your .env file.',
    );
  }

  const client = createSpotifyClient({ clientId, clientSecret, redirectUri });
  return { client, env };
}

export async function authenticate(
  client: SpotifyClient,
  env: RawEnv,
): Promise<AuthenticateResult> {
  const authorizationCode = ensureTrimmed(env.SPOTIFY_AUTHORIZATION_CODE);
  const envRefreshToken = ensureTrimmed(env.SPOTIFY_REFRESH_TOKEN);

  const storedRefreshToken = loadStoredRefreshToken() || envRefreshToken || null;
  let authTokens: AuthenticateResult | null = null;

  if (storedRefreshToken) {
    try {
      const refreshed = await client.refreshAccessToken(storedRefreshToken);
      console.log('Access token refreshed using stored refresh token.');
      authTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      };
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : String(refreshError);
      console.warn(
        `Warning: refresh flow failed (${message}). Falling back to authorization code.`,
      );
    }
  }

  if (!authTokens) {
    if (!authorizationCode) {
      throw new Error(
        'No stored refresh token found. Please set SPOTIFY_AUTHORIZATION_CODE with a fresh authorization code.',
      );
    }

    console.log('Exchanging authorization code for access token...');
    const exchanged = await client.exchangeAuthorizationCode(authorizationCode);
    console.log('Access token acquired.');
    authTokens = {
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
    };
  }

  if (authTokens.refreshToken) {
    persistRefreshToken(authTokens.refreshToken);
  } else {
    console.warn(
      'Warning: no refresh token returned by Spotify. You may need a new authorization code next time.',
    );
  }

  return authTokens;
}

function formatTrackRecord(item: any): LikedTrackRecord | null {
  const track = item?.track;
  if (!track || !track.id) return null;

  const artistEntries = Array.isArray(track.artists)
    ? (track.artists.map((artist: any) => ({
        id: artist?.id ?? null,
        name: artist?.name ?? '',
      })) as {
        id: string | null;
        name: string;
      }[])
    : [];

  const artistIds = artistEntries
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  return {
    track_id: track.id,
    track_name: track.name ?? '',
    artists: artistEntries,
    artist_ids: artistIds,
    added_at: item.added_at ?? '',
  };
}

export async function exportLikedSongs(options: {
  client: SpotifyClient;
  accessToken: string;
  pageLimit?: number;
}): Promise<void> {
  ensureDirectoryExists(SPOTIFY_OUTPUT_DIR);

  const savedTracks = await options.client.fetchAllSavedTracks(
    options.accessToken,
    options.pageLimit ? { pageLimit: options.pageLimit } : {},
  );
  const formatted: LikedTrackRecord[] = savedTracks
    .map((item: any) => formatTrackRecord(item))
    .filter((record): record is LikedTrackRecord => record !== null);

  writeJsonFile(FILES.likedJson, formatted);
  console.log(`Saved ${formatted.length} records to ${FILES.likedJson}`);

  const skippedFeaturesPath = FILES.skippedFeatures;
  if (fs.existsSync(skippedFeaturesPath)) {
    fs.unlinkSync(skippedFeaturesPath);
  }
}

function ensureTrackIds(records: LikedTrackRecord[]): void {
  const missingIds = records.filter((record) => !record.track_id);
  if (missingIds.length > 0) {
    throw new Error(
      'Input JSON is missing track_id values. Please re-export liked songs with the latest script before enriching.',
    );
  }
}

export async function enrichLikedSongs(options: {
  client: SpotifyClient;
  accessToken: string;
  inputPath: string;
}): Promise<EnrichedTrackRecord[]> {
  console.log(`Loading base liked songs from ${options.inputPath}...`);
  const baseRecords = loadJsonFile<LikedTrackRecord[]>(options.inputPath);
  ensureTrackIds(baseRecords);

  const trackIds = baseRecords.map((record) => record.track_id);
  console.log(`Enriching ${trackIds.length} tracks...`);

  const trackDetailsMap = await options.client.fetchTracksDetails(
    trackIds,
    options.accessToken,
    (processed, total) => {
      if (processed === total || processed % 50 === 0) {
        console.log(`Fetched track details for ${processed}/${total} tracks...`);
      }
    },
  );

  const artistIdSet = new Set<string>();
  const albumIdsNeedingDetails = new Set<string>();

  trackIds.forEach((trackId) => {
    const track = trackDetailsMap.get(trackId);
    if (track?.artists) {
      track.artists.forEach((artist: any) => {
        if (artist?.id) artistIdSet.add(artist.id);
      });
    }

    const album = track?.album;
    if (album?.id) {
      const needsAlbumFetch = !album.release_date || !album.images || album.images.length === 0;
      if (needsAlbumFetch) {
        albumIdsNeedingDetails.add(album.id);
      }
    }
  });

  const artistDetailsMap = await options.client.fetchArtistsDetails(
    Array.from(artistIdSet),
    options.accessToken,
    (processed, total) => {
      if (processed === total || processed % 50 === 0) {
        console.log(`Fetched artist details for ${processed}/${total} artists...`);
      }
    },
  );

  const albumDetailsMap = await options.client.fetchAlbumsDetails(
    Array.from(albumIdsNeedingDetails),
    options.accessToken,
    (processed, total) => {
      if (processed === total || processed % 50 === 0) {
        console.log(`Fetched album details for ${processed}/${total} albums...`);
      }
    },
  );

  const genresByArtist = new Map<string, string[]>();
  artistDetailsMap.forEach((artist: any, id: string) => {
    genresByArtist.set(id, Array.isArray(artist.genres) ? artist.genres.filter(Boolean) : []);
  });

  const enrichedRecords: EnrichedTrackRecord[] = baseRecords.map((baseRecord) => {
    const track = trackDetailsMap.get(baseRecord.track_id);
    if (!track) {
      console.warn(
        `Warning: track details not found for track_id ${baseRecord.track_id}. Using fallback data from JSON.`,
      );
    }

    const artists = Array.isArray(track?.artists) ? track.artists : baseRecord.artists;
    const artistIds = artists
      .map((artist: any) => artist?.id)
      .filter(
        (id: string | undefined | null): id is string => typeof id === 'string' && id.length > 0,
      );

    const albumFromTrack = track?.album ?? null;
    const albumDetails =
      albumFromTrack?.id && albumDetailsMap.has(albumFromTrack.id)
        ? albumDetailsMap.get(albumFromTrack.id)
        : albumFromTrack;

    const enrichedArtists = artistIds.map((id: string) => {
      const artist = artistDetailsMap.get(id);
      if (!artist) {
        const fallbackName = artists.find((entry: any) => entry?.id === id)?.name ?? '';
        return {
          id,
          name: fallbackName,
          genres: [] as string[],
          popularity: null,
          followersTotal: null,
          followers: { total: null },
          external_urls: {},
          spotifyUrl: null,
        };
      }

      return {
        id: artist.id,
        name: artist.name ?? '',
        genres: Array.isArray(artist.genres) ? artist.genres.filter(Boolean) : [],
        popularity: typeof artist.popularity === 'number' ? artist.popularity : null,
        followersTotal: typeof artist.followers?.total === 'number' ? artist.followers.total : null,
        followers: artist.followers ?? { total: null },
        external_urls: artist.external_urls ?? {},
        spotifyUrl: artist.external_urls?.spotify ?? null,
      };
    });

    const artistGenres = buildArtistGenresUnion(genresByArtist, artistIds);
    const artistGenresJoined = artistGenres.join('; ');

    const albumImage = selectAlbumImageUrl(
      Array.isArray(albumDetails?.images) ? albumDetails.images : undefined,
      300,
    );

    const album = albumDetails
      ? {
          id: albumDetails.id ?? null,
          name: albumDetails.name ?? '',
          release_date: albumDetails.release_date ?? null,
          release_date_precision: albumDetails.release_date_precision ?? null,
          total_tracks:
            typeof albumDetails.total_tracks === 'number' ? albumDetails.total_tracks : null,
          album_type: albumDetails.album_type ?? null,
          images: Array.isArray(albumDetails.images) ? albumDetails.images : [],
          spotifyUrl: albumDetails.external_urls?.spotify ?? null,
          album_spotify_url: albumDetails.external_urls?.spotify ?? null,
          image_300: albumImage ?? undefined,
        }
      : null;

    const year = album?.release_date
      ? String(album.release_date).slice(0, 4)
      : (track?.year ?? null);

    const trackSpotifyUrl = track?.external_urls?.spotify ?? null;

    const versionFlags = buildVersionFlags(track?.name ?? baseRecord.track_name);

    const enrichedRecord: EnrichedTrackRecord = {
      ...baseRecord,
      track_name: track?.name ?? baseRecord.track_name,
      artists: artists.map((artist: any) => ({ id: artist?.id ?? null, name: artist?.name ?? '' })),
      artists_joined: artists
        .map((artist: any) => artist?.name ?? '')
        .filter(Boolean)
        .join('; '),
      duration_ms: typeof track?.duration_ms === 'number' ? track.duration_ms : null,
      explicit: typeof track?.explicit === 'boolean' ? track.explicit : null,
      popularity: typeof track?.popularity === 'number' ? track.popularity : null,
      external_ids: track?.external_ids ?? {},
      external_urls: track?.external_urls ?? {},
      album,
      artistas_enriquecidos: enrichedArtists,
      year,
      track_spotify_url: trackSpotifyUrl,
      artist_genres: artistGenres,
      artist_genres_joined: artistGenresJoined,
      version_flags: versionFlags ?? undefined,
    };

    return enrichedRecord;
  });

  return enrichedRecords;
}

export async function runEnrichment(options: {
  client: SpotifyClient;
  accessToken: string;
  inputPath: string;
}): Promise<void> {
  const enrichedRecords = await enrichLikedSongs(options);
  writeJsonFile(FILES.enrichedJson, enrichedRecords);
  console.log(`Saved enriched data to ${FILES.enrichedJson}`);
  const csvContent = buildCsvContent(enrichedRecords);
  writeTextFile(FILES.enrichedCsv, csvContent);
  console.log(`Saved enriched CSV to ${FILES.enrichedCsv}`);

  const compactRecords = buildCompactTracks(enrichedRecords);
  writeJsonFile(FILES.compactJson, compactRecords);
  console.log(`Saved compact enriched data to ${FILES.compactJson}`);

  // Maintain backwards compatibility: overwrite the base liked songs file with the compact view
  writeJsonFile(FILES.likedJson, compactRecords);
  console.log(`Saved compact liked songs to ${FILES.likedJson}`);
}

export function buildCompactTracks(records: EnrichedTrackRecord[]): any[] {
  const compactRecords: any[] = [];

  records.forEach((record) => {
    if (!record.track_id) {
      console.warn('Warning: skipping track without track_id in compact stage.');
      return;
    }
    if (!record.added_at) {
      console.warn(
        `Warning: missing added_at value for track_id ${record.track_id}. Track will be skipped in compact output.`,
      );
      return;
    }

    const artists = Array.isArray(record.artists)
      ? record.artists.filter((artist) => artist && (artist.id || artist.name))
      : [];
    if (artists.length === 0) {
      console.warn(
        `Warning: no artists found for track_id ${record.track_id}. Track will be skipped in compact output.`,
      );
      return;
    }

    const album = record.album;
    if (!album) {
      console.warn(
        `Warning: no album data found for track_id ${record.track_id}. Track will be skipped in compact output.`,
      );
      return;
    }

    const trackSpotifyUrl = record.track_spotify_url ?? record.external_urls?.spotify ?? null;
    if (!trackSpotifyUrl) {
      console.warn(
        `Warning: no Spotify URL found for track_id ${record.track_id}. Track will be skipped in compact output.`,
      );
      return;
    }

    const artistGenres = Array.isArray(record.artistas_enriquecidos)
      ? Array.from(
          new Set(
            record.artistas_enriquecidos
              .flatMap((artist) => (Array.isArray(artist.genres) ? artist.genres : []))
              .filter((genre): genre is string => Boolean(genre)),
          ),
        ).sort((a, b) => a.localeCompare(b))
      : [];

    const compact: any = {
      track_id: record.track_id,
      track_name: record.track_name ?? '',
      added_at: record.added_at,
      artists: artists.map((artist) => {
        const artistEntry: { id?: string; name: string } = {
          name: artist.name ?? '',
        };
        if (artist.id) {
          artistEntry.id = artist.id;
        }
        return artistEntry;
      }),
      // album properties added below once computed
      album: {
        ...(album.id ? { id: album.id } : {}),
        name: album.name ?? '',
        ...(album.release_date ? { release_date: album.release_date } : {}),
        ...(album.album_spotify_url ? { album_spotify_url: album.album_spotify_url } : {}),
      },
      track_spotify_url: trackSpotifyUrl,
    };

    const albumImage = album.image_300 ?? selectAlbumImageUrl(album.images, 300);
    if (albumImage) {
      compact.album.image_300 = albumImage;
    }

    const yearSource = compact.album.release_date ?? record.year ?? null;
    if (yearSource) {
      compact.year = String(yearSource).slice(0, 4);
    }

    const combinedGenres =
      Array.isArray(record.artist_genres) && record.artist_genres.length > 0
        ? record.artist_genres
        : artistGenres;
    if (combinedGenres.length > 0) {
      compact.artist_genres = combinedGenres;
    }

    if (typeof record.popularity === 'number') {
      compact.popularity = record.popularity;
    }

    if (record.explicit === true) {
      compact.explicit = true;
    }

    const versionFlags =
      record.version_flags ?? buildVersionFlags(compact.track_name ?? record.track_name);
    if (versionFlags) {
      compact.version_flags = versionFlags;
    }

    const isrc = record.external_ids?.isrc;
    if (isrc) {
      compact.isrc = isrc;
    }

    compactRecords.push(compact);
  });

  return compactRecords;
}

export async function compactLikedSongs(options: {
  inputPath: string;
  outputPath?: string;
}): Promise<void> {
  const inputPath = options.inputPath;
  console.log(`Loading enriched liked songs from ${inputPath}...`);
  const enrichedRecords = loadJsonFile<EnrichedTrackRecord[]>(inputPath);

  const compactRecords = buildCompactTracks(enrichedRecords);
  compactRecords.forEach((_record, index) => {
    if ((index + 1) % 100 === 0 || index + 1 === compactRecords.length) {
      console.log(`Compacted ${index + 1}/${compactRecords.length} tracks...`);
    }
  });

  const outputPath = options.outputPath ?? FILES.compactJson;
  writeJsonFile(outputPath, compactRecords);
  console.log(`Saved compact enriched data to ${outputPath}`);
}
