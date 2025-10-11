import fs from 'fs';
import path from 'path';

import type { EnrichedTrackRecord } from './types';

export function ensureTrimmed(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function ensureDirectoryExists(targetPath: string): void {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function writeTextFile(filePath: string, content: string): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

export function loadJsonFile<T>(filePath: string): T {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse ${absolutePath}: ${message}`);
  }
}

export function buildArtistGenresUnion(genresByArtist: Map<string, string[]>, artistIds: string[]): string[] {
  const genres = new Set<string>();
  artistIds.forEach(id => {
    const artistGenres = genresByArtist.get(id);
    if (!artistGenres) return;
    artistGenres.forEach(genre => {
      if (genre) genres.add(genre);
    });
  });
  return Array.from(genres).sort((a, b) => a.localeCompare(b));
}

export function selectAlbumImageUrl(
  images: { url: string; width?: number; height?: number }[] | undefined,
  targetWidth = 300
): string | null {
  if (!images || images.length === 0) return null;

  type AlbumImage = { url: string; width?: number; height?: number };

  const candidates: AlbumImage[] = images
    .filter((image): image is AlbumImage => Boolean(image?.url))
    .map(image => ({ url: image.url, width: image.width, height: image.height }));

  if (candidates.length === 0) return null;

  let selected = candidates[0];
  let bestDiff = Math.abs((selected.width ?? targetWidth) - targetWidth);

  for (const image of candidates.slice(1)) {
    const width = image.width ?? targetWidth;
    const diff = Math.abs(width - targetWidth);
    if (diff < bestDiff) {
      selected = image;
      bestDiff = diff;
    }
  }

  return selected.url;
}

export function buildVersionFlags(trackName: string | undefined):
  | {
      is_live?: boolean;
      is_remix?: boolean;
      is_extended?: boolean;
      is_instrumental?: boolean;
    }
  | null {
  if (!trackName) return null;
  const lower = trackName.toLowerCase();
  const flags: Record<string, boolean> = {};

  if (/\blive\b/.test(lower)) flags.is_live = true;
  if (/\bremix\b/.test(lower)) flags.is_remix = true;
  if (/\bextended\b/.test(lower)) flags.is_extended = true;
  if (/\binstrumental\b/.test(lower)) flags.is_instrumental = true;

  return Object.keys(flags).length > 0 ? (flags as any) : null;
}

export function buildCsvContent(records: EnrichedTrackRecord[]): string {
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

  const buildValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const rows = records.map(record =>
    headers
      .map(header => {
        switch (header) {
          case 'track_id':
            return buildValue(record.track_id);
          case 'track_name':
            return buildValue(record.track_name);
          case 'artists_joined':
            return buildValue(record.artists_joined || '');
          case 'added_at':
            return buildValue(record.added_at || '');
          case 'year':
            return buildValue(record.year || '');
          case 'duration_ms':
            return buildValue(record.duration_ms ?? '');
          case 'explicit':
            return buildValue(record.explicit ?? false);
          case 'popularity':
            return buildValue(record.popularity ?? '');
          case 'preview_url':
            return buildValue(record.preview_url || '');
          case 'album_name':
            return buildValue(record.album?.name || '');
          case 'album_release_date':
            return buildValue(record.album?.release_date || '');
          case 'album_type':
            return buildValue(record.album?.album_type || '');
          case 'artist_genres_joined':
            return buildValue(record.artist_genres_joined || '');
          case 'markets_count':
            return buildValue(record.markets_count ?? '');
          case 'isrc':
            return buildValue(record.external_ids?.isrc || '');
          case 'track_spotify_url':
            return buildValue(record.track_spotify_url || record.external_urls?.spotify || '');
          case 'album_spotify_url':
            return buildValue(record.album?.album_spotify_url || record.album?.spotifyUrl || '');
          default:
            return '';
        }
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
