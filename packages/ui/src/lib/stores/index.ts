import { writable, derived } from 'svelte/store';
import type { Track, TimeFilter } from '../types';

export const tracks = writable<Track[]>([]);
export const filter = writable<TimeFilter>('all');
export const status = writable<{ message: string; tone: 'info' | 'success' | 'warning' | 'error' }>(
  { message: 'Ready to explore.', tone: 'info' }
);
export const isLoading = writable(false);

export const filteredTracks = derived([tracks, filter], ([$tracks, $filter]) => {
  if ($filter === 'all') return $tracks;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return $tracks.filter((t) => {
    if (!t.addedAt) return false;
    const d = new Date(t.addedAt);
    const ty = d.getFullYear();
    const tm = d.getMonth();

    switch ($filter) {
      case 'this_month':
        return ty === year && tm === month;
      case 'last_month':
        return month === 0 ? ty === year - 1 && tm === 11 : ty === year && tm === month - 1;
      case 'this_year':
        return ty === year;
      case 'last_year':
        return ty === year - 1;
      default:
        return true;
    }
  });
});

export const metrics = derived(filteredTracks, ($filtered) => {
  const artistSet = new Set<string>();
  const genreCounts: Record<string, number> = {};

  $filtered.forEach((t) => {
    t.artists.forEach((a: { name: string; genres?: string[] }) => artistSet.add(a.name));
    t.artists.forEach((a: { name: string; genres?: string[] }) => {
      (a.genres || []).forEach((g: string) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
  });

  const sorted = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenre = sorted[0]?.[0] || '—';

  return {
    total: $filtered.length,
    artists: artistSet.size,
    topGenre: topGenre.charAt(0).toUpperCase() + topGenre.slice(1),
  };
});
