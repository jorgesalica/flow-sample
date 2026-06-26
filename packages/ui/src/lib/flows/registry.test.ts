import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FlowDefinition, FlowStats } from './registry';

// The registry is a module-level singleton. Each test gets a fresh module
// instance (and therefore an empty registry) via dynamic import after a reset,
// so registrations from one test never leak into another.
async function freshRegistry() {
  vi.resetModules();
  return import('./registry');
}

function makeFlow(overrides: Partial<FlowDefinition> = {}): FlowDefinition {
  const stats: FlowStats = { count: 0, status: 'active' };
  return {
    id: 'spotify',
    name: 'Spotify Flow',
    icon: '🎵',
    description: 'Explore your music.',
    route: '/spotify',
    color: 'from-green-400 to-emerald-500',
    getStats: async () => stats,
    ...overrides,
  };
}

describe('flow registry', () => {
  let registerFlow: typeof import('./registry').registerFlow;
  let getFlows: typeof import('./registry').getFlows;
  let getFlow: typeof import('./registry').getFlow;

  beforeEach(async () => {
    ({ registerFlow, getFlows, getFlow } = await freshRegistry());
  });

  it('starts empty', () => {
    expect(getFlows()).toEqual([]);
    expect(getFlow('spotify')).toBeUndefined();
  });

  it('registers a flow and retrieves it by id', () => {
    const flow = makeFlow();
    registerFlow(flow);

    expect(getFlows()).toHaveLength(1);
    expect(getFlow('spotify')).toBe(flow);
  });

  it('registers multiple distinct flows in insertion order', () => {
    const spotify = makeFlow({ id: 'spotify' });
    const lyrics = makeFlow({ id: 'lyrics', name: 'Lyrics Flow' });

    registerFlow(spotify);
    registerFlow(lyrics);

    expect(getFlows().map((f) => f.id)).toEqual(['spotify', 'lyrics']);
  });

  it('ignores duplicate ids (first registration wins)', () => {
    const first = makeFlow({ id: 'spotify', name: 'Original' });
    const duplicate = makeFlow({ id: 'spotify', name: 'Replacement' });

    registerFlow(first);
    registerFlow(duplicate);

    expect(getFlows()).toHaveLength(1);
    expect(getFlow('spotify')?.name).toBe('Original');
  });

  it('returns undefined for an unknown id', () => {
    registerFlow(makeFlow({ id: 'spotify' }));

    expect(getFlow('does-not-exist')).toBeUndefined();
  });

  it('getFlows returns a defensive copy, not the internal array', () => {
    registerFlow(makeFlow({ id: 'spotify' }));

    const snapshot = getFlows();
    snapshot.push(makeFlow({ id: 'injected' }));

    // Mutating the returned array must not affect the registry.
    expect(getFlows()).toHaveLength(1);
    expect(getFlow('injected')).toBeUndefined();
  });
});
