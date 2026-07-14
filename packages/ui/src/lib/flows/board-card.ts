export const FlowStatus = {
  ACTIVE: 'active',
  CONFIGURED: 'configured',
  DISABLED: 'disabled',
  ERROR: 'error',
} as const;

export type FlowStatus = (typeof FlowStatus)[keyof typeof FlowStatus];

export interface FlowStats {
  count: number;
  status: FlowStatus;
  statusMessage?: string;
}

export const BoardCardState = {
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error',
  STALE: 'stale',
} as const;

export type BoardCardState = (typeof BoardCardState)[keyof typeof BoardCardState];

export const BoardCardTone = {
  NEUTRAL: 'neutral',
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
} as const;

export type BoardCardTone = (typeof BoardCardTone)[keyof typeof BoardCardTone];

export interface BoardCardStatus {
  label: string;
  tone: BoardCardTone;
}

export interface BoardCardMetric {
  label: string;
  value: string;
  detail?: string;
}

export interface BoardCardSummary {
  status: BoardCardStatus;
  primary: BoardCardMetric;
}

export interface BoardCardExpandedContent {
  heading: string;
  metrics: BoardCardMetric[];
  note?: string;
}

export interface BoardCardLoading {
  state: typeof BoardCardState.LOADING;
  canOpen: false;
}

export interface BoardCardReady {
  state: typeof BoardCardState.READY;
  canOpen: boolean;
  summary: BoardCardSummary;
  expanded?: BoardCardExpandedContent;
}

export interface BoardCardEmpty {
  state: typeof BoardCardState.EMPTY;
  canOpen: boolean;
  status: BoardCardStatus;
  title: string;
  message: string;
}

export interface BoardCardError {
  state: typeof BoardCardState.ERROR;
  canOpen: false;
  status: BoardCardStatus;
  title: string;
  message: string;
}

export interface BoardCardStale {
  state: typeof BoardCardState.STALE;
  canOpen: boolean;
  summary: BoardCardSummary;
  expanded?: BoardCardExpandedContent;
  message: string;
}

export type BoardCardSnapshot = BoardCardReady | BoardCardEmpty | BoardCardError | BoardCardStale;

export type BoardCardViewState = BoardCardLoading | BoardCardSnapshot;

export interface BoardCardContract {
  load: () => Promise<BoardCardSnapshot>;
}

export interface StatsBoardCardOptions {
  metricLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  errorTitle?: string;
  errorMessage?: string;
}

function statusFor(stats: FlowStats): BoardCardStatus {
  switch (stats.status) {
    case FlowStatus.ACTIVE:
      return {
        label: stats.statusMessage ?? 'Active',
        tone: BoardCardTone.SUCCESS,
      };
    case FlowStatus.CONFIGURED:
      return {
        label: stats.statusMessage ?? 'Configured',
        tone: BoardCardTone.INFO,
      };
    case FlowStatus.DISABLED:
      return {
        label: stats.statusMessage ?? 'Unavailable',
        tone: BoardCardTone.NEUTRAL,
      };
    case FlowStatus.ERROR:
      return { label: 'Error', tone: BoardCardTone.DANGER };
  }
}

function isFlowStatus(value: unknown): value is FlowStatus {
  return typeof value === 'string' && Object.values(FlowStatus).includes(value as FlowStatus);
}

export function createBoardCardError(
  title = 'Summary unavailable',
  message = 'The latest flow summary could not be loaded.'
): BoardCardError {
  return {
    state: BoardCardState.ERROR,
    canOpen: false,
    status: { label: 'Error', tone: BoardCardTone.DANGER },
    title,
    message,
  };
}

export function createStatsBoardCard(
  loadStats: () => Promise<FlowStats>,
  options: StatsBoardCardOptions
): BoardCardContract {
  return {
    async load(): Promise<BoardCardSnapshot> {
      try {
        const stats = await loadStats();
        if (!Number.isSafeInteger(stats.count) || stats.count < 0 || !isFlowStatus(stats.status)) {
          return createBoardCardError(options.errorTitle, options.errorMessage);
        }

        if (stats.status === FlowStatus.ERROR) {
          return createBoardCardError(options.errorTitle, options.errorMessage);
        }

        const status = statusFor(stats);
        if (stats.status === FlowStatus.DISABLED || stats.count <= 0) {
          return {
            state: BoardCardState.EMPTY,
            canOpen: stats.status !== FlowStatus.DISABLED,
            status,
            title: options.emptyTitle,
            message: options.emptyMessage,
          };
        }

        return {
          state: BoardCardState.READY,
          canOpen: true,
          summary: {
            status,
            primary: {
              label: options.metricLabel,
              value: String(stats.count),
            },
          },
        };
      } catch {
        return createBoardCardError(options.errorTitle, options.errorMessage);
      }
    },
  };
}

export function hasBoardCardData(
  state: BoardCardViewState
): state is BoardCardReady | BoardCardStale {
  return state.state === BoardCardState.READY || state.state === BoardCardState.STALE;
}

export function createStaleBoardCard(
  previous: BoardCardReady | BoardCardStale,
  message: string
): BoardCardStale {
  return {
    ...previous,
    state: BoardCardState.STALE,
    message,
  };
}
