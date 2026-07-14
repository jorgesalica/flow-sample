import { describe, expect, it } from 'vitest';
import {
  BoardCardState,
  BoardCardTone,
  FlowStatus,
  createStaleBoardCard,
  createStatsBoardCard,
  type BoardCardReady,
} from './board-card';

describe('board card contract', () => {
  it('maps a successful stats result to a typed collapsed summary', async () => {
    const contract = createStatsBoardCard(
      async () => ({ count: 12, status: FlowStatus.ACTIVE, statusMessage: 'Streaming' }),
      { metricLabel: 'Candles', emptyTitle: 'No candles', emptyMessage: 'Start the stream.' }
    );

    await expect(contract.load()).resolves.toEqual({
      state: BoardCardState.READY,
      canOpen: true,
      summary: {
        status: { label: 'Streaming', tone: BoardCardTone.SUCCESS },
        primary: { label: 'Candles', value: '12' },
      },
    });
  });

  it('maps configured zero-count results to an openable empty state', async () => {
    const contract = createStatsBoardCard(
      async () => ({ count: 0, status: FlowStatus.CONFIGURED }),
      { metricLabel: 'Chats', emptyTitle: 'No chats', emptyMessage: 'Start a conversation.' }
    );

    await expect(contract.load()).resolves.toEqual({
      state: BoardCardState.EMPTY,
      canOpen: true,
      status: { label: 'Configured', tone: BoardCardTone.INFO },
      title: 'No chats',
      message: 'Start a conversation.',
    });
  });

  it('keeps disabled definitions non-interactive', async () => {
    const contract = createStatsBoardCard(
      async () => ({
        count: 0,
        status: FlowStatus.DISABLED,
        statusMessage: 'Coming soon',
      }),
      { metricLabel: 'Items', emptyTitle: 'Unavailable', emptyMessage: 'Not configured.' }
    );

    await expect(contract.load()).resolves.toMatchObject({
      state: BoardCardState.EMPTY,
      canOpen: false,
      status: { label: 'Coming soon', tone: BoardCardTone.NEUTRAL },
    });
  });

  it.each([
    async () => ({ count: 0, status: FlowStatus.ERROR, statusMessage: 'Disconnected' }),
    async () => {
      throw new Error('network failed');
    },
  ])('isolates failed summary loads as an error state', async (loadStats) => {
    const contract = createStatsBoardCard(loadStats, {
      metricLabel: 'Items',
      emptyTitle: 'No items',
      emptyMessage: 'Nothing yet.',
      errorTitle: 'Summary unavailable',
      errorMessage: 'Try again later.',
    });

    await expect(contract.load()).resolves.toEqual({
      state: BoardCardState.ERROR,
      canOpen: false,
      status: { label: 'Error', tone: BoardCardTone.DANGER },
      title: 'Summary unavailable',
      message: 'Try again later.',
    });
  });

  it('rejects malformed runtime counts instead of rendering invalid metrics', async () => {
    const contract = createStatsBoardCard(
      async () => ({ count: Number.NaN, status: FlowStatus.ACTIVE }),
      {
        metricLabel: 'Items',
        emptyTitle: 'No items',
        emptyMessage: 'Nothing yet.',
        errorTitle: 'Summary unavailable',
        errorMessage: 'Try again later.',
      }
    );

    await expect(contract.load()).resolves.toMatchObject({
      state: BoardCardState.ERROR,
      title: 'Summary unavailable',
    });
  });

  it('preserves the last ready summary and expansion when a refresh becomes stale', () => {
    const ready: BoardCardReady = {
      state: BoardCardState.READY,
      canOpen: true,
      summary: {
        status: { label: 'Active', tone: BoardCardTone.SUCCESS },
        primary: { label: 'Tracks', value: '42', detail: '8 genres' },
      },
      expanded: {
        heading: 'Library snapshot',
        metrics: [{ label: 'Top genre', value: 'Rock' }],
      },
    };

    expect(createStaleBoardCard(ready, 'Refresh failed. Showing previous data.')).toEqual({
      ...ready,
      state: BoardCardState.STALE,
      message: 'Refresh failed. Showing previous data.',
    });
  });
});
