import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import {
  BoardCardState,
  BoardCardTone,
  type BoardCardReady,
  type BoardCardViewState,
} from '@lib/flows';
import BoardCardContent from './BoardCardContent.svelte';

const readyCard: BoardCardReady = {
  state: BoardCardState.READY,
  canOpen: true,
  summary: {
    status: { label: 'Active', tone: BoardCardTone.SUCCESS },
    primary: { label: 'Tracks', value: '42', detail: '8 genres' },
  },
  expanded: {
    heading: 'Library snapshot',
    metrics: [
      { label: 'Top genre', value: 'rock' },
      { label: 'Year range', value: '1998-2025' },
    ],
    note: 'Open the flow for track details.',
  },
};

function renderContent(card: BoardCardViewState, showExpanded = true) {
  return render(BoardCardContent, {
    props: {
      card,
      description: 'Explore your music library.',
      showExpanded,
    },
  });
}

describe('BoardCardContent', () => {
  it('uses the shared compact primitive for loading, empty, and error states', () => {
    const loading = renderContent({ state: BoardCardState.LOADING, canOpen: false });
    expect(screen.getByRole('status')).toHaveTextContent('Loading summary');
    expect(screen.getByRole('status')).toHaveClass('ui-async-state--compact');
    loading.unmount();

    const empty = renderContent({
      state: BoardCardState.EMPTY,
      canOpen: true,
      status: { label: 'Configured', tone: BoardCardTone.INFO },
      title: 'No tracks synced',
      message: 'Sync Spotify to populate this summary.',
    });
    expect(screen.getByText('Configured')).toHaveClass('ui-badge--info');
    expect(screen.getByRole('status')).toHaveTextContent('No tracks synced');
    empty.unmount();

    renderContent({
      state: BoardCardState.ERROR,
      canOpen: false,
      status: { label: 'Error', tone: BoardCardTone.DANGER },
      title: 'Summary unavailable',
      message: 'Try refreshing the board.',
    });
    expect(screen.getByText('Error')).toHaveClass('ui-badge--danger');
    expect(screen.getByRole('alert')).toHaveTextContent('Try refreshing the board.');
  });

  it('keeps the typed summary visible when expanded content is collapsed', () => {
    renderContent(readyCard, false);

    expect(screen.getByText('Active')).toHaveClass('ui-badge--success');
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Tracks')).toBeInTheDocument();
    expect(screen.getByText('8 genres')).toBeInTheDocument();
    expect(screen.queryByText('Explore your music library.')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Library snapshot' })).not.toBeInTheDocument();
  });

  it('renders expanded metrics without knowing which flow produced them', () => {
    renderContent(readyCard);

    expect(screen.getByText('Explore your music library.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Library snapshot' })).toBeInTheDocument();
    expect(screen.getByText('Top genre')).toBeInTheDocument();
    expect(screen.getByText('rock')).toBeInTheDocument();
    expect(screen.getByText('Open the flow for track details.')).toBeInTheDocument();
  });

  it('renders stale data with an explicit warning and the last summary', () => {
    renderContent({
      ...readyCard,
      state: BoardCardState.STALE,
      message: 'Refresh failed. Showing the previous summary.',
    });

    expect(screen.getByText('Stale')).toHaveClass('ui-badge--warning');
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Refresh failed. Showing the previous summary.'
    );
  });
});
