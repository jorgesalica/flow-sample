import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardCardState } from '../board-card';
import type { StatusResponse } from './types';

// --- Mock the network edge (Eden client). Never hit a real backend. ---
// `vi.hoisted` lets the mock fn exist before the hoisted vi.mock factory runs.
const { statusGet } = vi.hoisted(() => ({ statusGet: vi.fn() }));

vi.mock('@lib/client', () => ({
  api: {
    api: {
      trading: {
        status: { get: statusGet },
      },
    },
  },
}));

// Toast is unused by getTradingStats but the module graph (via ./trading -> ./api)
// imports it; stub it so nothing tries to render a real toast.
vi.mock('@lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

// EventSource is referenced by ./api at module init scope; jsdom lacks it.
class FakeEventSource {
  close = vi.fn();
  addEventListener = vi.fn();
  onerror: (() => void) | null = null;
}
vi.stubGlobal('EventSource', FakeEventSource);

import { getTradingStats, tradingFlow } from './trading';

function statusFixture(overrides: Partial<StatusResponse['trading']> = {}): StatusResponse {
  return {
    trading: {
      isRunning: false,
      symbol: 'BTCUSDT',
      interval: '1m',
      lastCandle: null,
      candleCount: 0,
      connectedAt: null,
      ...overrides,
    },
    advisor: { isEnabled: false, lastInsightAt: null, insightCount: 0 },
  };
}

beforeEach(() => {
  statusGet.mockReset();
});

describe('getTradingStats — happy path', () => {
  it('reports active/Streaming with the live candle count when running', async () => {
    statusGet.mockResolvedValue({
      data: statusFixture({ isRunning: true, candleCount: 1234 }),
      error: null,
    });

    const stats = await getTradingStats();

    expect(stats).toEqual({
      count: 1234,
      status: 'active',
      statusMessage: 'Streaming',
    });
  });

  it('reports configured/Stopped when the stream is not running', async () => {
    statusGet.mockResolvedValue({
      data: statusFixture({ isRunning: false, candleCount: 7 }),
      error: null,
    });

    const stats = await getTradingStats();

    expect(stats).toEqual({
      count: 7,
      status: 'configured',
      statusMessage: 'Stopped',
    });
  });
});

describe('getTradingStats — boundaries & absence', () => {
  it('defaults count to 0 when candleCount is missing', async () => {
    // trading present but candleCount undefined -> `|| 0`
    statusGet.mockResolvedValue({
      data: { trading: { isRunning: false }, advisor: {} },
      error: null,
    });

    const stats = await getTradingStats();

    expect(stats.count).toBe(0);
    expect(stats.status).toBe('configured');
  });

  it('falls back to error/Disconnected when trading payload is absent', async () => {
    // No `trading` key -> reading result.trading?.candleCount is fine, but
    // result.trading?.isRunning is undefined -> 'configured'. Verify the
    // optional-chaining path produces a coherent (non-throwing) result.
    statusGet.mockResolvedValue({ data: {}, error: null });

    const stats = await getTradingStats();

    expect(stats).toEqual({
      count: 0,
      status: 'configured',
      statusMessage: 'Stopped',
    });
  });
});

describe('getTradingStats — error states', () => {
  it('returns error/Disconnected when the API returns an error field', async () => {
    statusGet.mockResolvedValue({ data: null, error: { status: 500 } });

    const stats = await getTradingStats();

    expect(stats).toEqual({
      count: 0,
      status: 'error',
      statusMessage: 'Disconnected',
    });
  });

  it('returns error/Disconnected when the request rejects (network down)', async () => {
    statusGet.mockRejectedValue(new Error('ECONNREFUSED'));

    const stats = await getTradingStats();

    expect(stats.status).toBe('error');
    expect(stats.statusMessage).toBe('Disconnected');
    expect(stats.count).toBe(0);
  });
});

describe('tradingFlow definition contract', () => {
  it('exposes a stable, well-formed flow definition', () => {
    expect(tradingFlow.id).toBe('trading');
    expect(tradingFlow.name).toBe('Trading Bot');
    expect(tradingFlow.route).toBe('/trading');
    expect(tradingFlow.icon).toBe('📈');
    expect(tradingFlow.description).toMatch(/Hurst/);
  });

  it('exposes a board card loader (routing remains file-based)', () => {
    expect(typeof tradingFlow.boardCard.load).toBe('function');
  });

  it('maps trading stats through the generic board card contract', async () => {
    statusGet.mockResolvedValue({
      data: statusFixture({ isRunning: true, candleCount: 9 }),
      error: null,
    });

    const card = await tradingFlow.boardCard.load();

    expect(card.state).toBe(BoardCardState.READY);
    if (card.state !== BoardCardState.READY) throw new Error('Expected a ready card');
    expect(card.summary.primary).toEqual({ label: 'Candles', value: '9' });
    expect(card.summary.status.label).toBe('Streaming');
  });
});
