import { describe, expect, it } from 'vitest';
import { BoardCardState, type BoardCardContract } from './board-card';
import { createFlowRegistry, type FlowDefinition } from './registry';

const boardCard: BoardCardContract = {
  load: async () => ({
    state: BoardCardState.EMPTY,
    canOpen: true,
    status: { label: 'Configured', tone: 'info' },
    title: 'No items',
    message: 'Nothing has been created yet.',
  }),
};

function makeFlow(overrides: Partial<FlowDefinition> = {}): FlowDefinition {
  return {
    id: 'spotify',
    name: 'Spotify Flow',
    icon: 'M',
    description: 'Explore your music.',
    route: '/spotify',
    boardCard,
    ...overrides,
  };
}

describe('flow registry', () => {
  it('keeps validated definitions in manifest order', () => {
    const spotify = makeFlow();
    const lyrics = makeFlow({ id: 'lyrics', name: 'Lyrics Flow', route: '/lyrics' });
    const registry = createFlowRegistry([spotify, lyrics]);

    expect(registry.getFlows()).toEqual([spotify, lyrics]);
    expect(registry.getFlow('lyrics')).toEqual(lyrics);
    expect(registry.getFlow('lyrics')).not.toBe(lyrics);
    expect(registry.getFlow('missing')).toBeUndefined();
  });

  it('rejects duplicate ids instead of silently discarding a definition', () => {
    expect(() => createFlowRegistry([makeFlow(), makeFlow({ name: 'Duplicate Spotify' })])).toThrow(
      'Duplicate flow id "spotify"'
    );
  });

  it.each([
    {},
    { id: '', name: 'Missing id', icon: 'M', description: 'Description', route: '/missing' },
    { id: 'missing-name', name: '', icon: 'M', description: 'Description', route: '/missing' },
    { id: 'missing-route', name: 'Missing route', icon: 'M', description: 'Description' },
    {
      id: 'missing-board-card',
      name: 'Missing card',
      icon: 'M',
      description: 'Description',
      route: '/missing',
    },
    {
      id: 'invalid-route',
      name: 'Invalid route',
      icon: 'M',
      description: 'Description',
      route: 'missing-leading-slash',
      boardCard,
    },
    {
      id: 'invalid-card',
      name: 'Invalid card',
      icon: 'M',
      description: 'Description',
      route: '/invalid-card',
      boardCard: { load: 'not-a-function' },
    },
  ])('rejects incomplete runtime definitions', (definition) => {
    expect(() => createFlowRegistry([definition])).toThrow(/Invalid flow definition/);
  });

  it('returns a defensive manifest copy', () => {
    const registry = createFlowRegistry([makeFlow()]);
    const snapshot = registry.getFlows();
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0]?.boardCard)).toBe(true);
    snapshot.push(makeFlow({ id: 'injected', route: '/injected' }));

    expect(registry.getFlows()).toHaveLength(1);
    expect(registry.getFlow('injected')).toBeUndefined();
  });
});
