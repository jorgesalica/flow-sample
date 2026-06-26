import type { Track, SearchOptions, StatusMessage } from '@flows/shared';
import type { TopStats } from '@lib/types';

// Track Data
let tracksState = $state<Track[]>([]);
let totalTracksState = $state(0);

// Search & Filter State
let searchOptionsState = $state<SearchOptions>({
  page: 1,
  limit: 24,
  q: '',
  sortBy: 'added_at',
  sortOrder: 'desc',
});

// UI State
let statusState = $state<StatusMessage>({
  message: 'Ready to explore.',
  tone: 'info',
});
let isLoadingState = $state(false);
let isAuthenticatedState = $state(false);
let topStatsState = $state<TopStats>({
  total: 0,
  artists: 0,
  topGenre: '—',
  genres: [],
  decadeDistribution: {},
});

export const spotifyStore = {
  // Track Data
  get tracks(): Track[] {
    return tracksState;
  },
  set tracks(value: Track[]) {
    tracksState = value;
  },
  appendTracks(value: Track[]): void {
    tracksState = [...tracksState, ...value];
  },
  get totalTracks(): number {
    return totalTracksState;
  },
  set totalTracks(value: number) {
    totalTracksState = value;
  },

  // Search & Filter State
  get searchOptions(): SearchOptions {
    return searchOptionsState;
  },
  set searchOptions(value: SearchOptions) {
    searchOptionsState = value;
  },

  // UI State
  get status(): StatusMessage {
    return statusState;
  },
  set status(value: StatusMessage) {
    statusState = value;
  },
  get isLoading(): boolean {
    return isLoadingState;
  },
  set isLoading(value: boolean) {
    isLoadingState = value;
  },
  get isAuthenticated(): boolean {
    return isAuthenticatedState;
  },
  set isAuthenticated(value: boolean) {
    isAuthenticatedState = value;
  },
  get topStats(): TopStats {
    return topStatsState;
  },
  set topStats(value: TopStats) {
    topStatsState = value;
  },
};
