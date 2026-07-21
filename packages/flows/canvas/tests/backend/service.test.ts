import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasAnalysis, CanvasSourceType } from '@flows/shared';
import type { CanvasRepository } from '../../src/domain/ports';
import { CanvasService, type CanvasAnalyzer } from '../../src/backend/service';

class MemoryCanvasRepository implements CanvasRepository {
  analyses = new Map<string, CanvasAnalysis>();
  listBySourceType = vi.fn((sourceType: CanvasSourceType) =>
    [...this.analyses.values()].filter((analysis) => analysis.sourceType === sourceType),
  );
  save = vi.fn((analysis: CanvasAnalysis) => {
    this.analyses.set(analysis.sourceId, analysis);
  });
  deleteBySourceId = vi.fn((sourceId: string) => {
    this.analyses.delete(sourceId);
  });

  findBySourceId(sourceId: string): CanvasAnalysis | null {
    return this.analyses.get(sourceId) ?? null;
  }
}

const analyzer = vi.fn<CanvasAnalyzer>();

function makeService(repository: CanvasRepository): CanvasService {
  const ids = ['source-id', 'analysis-id'];
  return new CanvasService(repository, analyzer, {
    now: () => new Date('2026-07-21T12:00:00.000Z'),
    randomUUID: () => ids.shift() ?? 'unexpected-id',
  });
}

describe('CanvasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyzer.mockResolvedValue({
      annotations: [{ tokenId: 't_001', layerId: 'meaning', label: 'Theme', detail: 'Detail' }],
      meta: { theme: 'Greeting' },
      modelUsed: 'gpt-oss-120b',
      providerUsed: 'cerebras',
    });
  });

  it('creates and persists a complete user-text analysis', async () => {
    const repository = new MemoryCanvasRepository();
    const service = makeService(repository);

    const analysis = await service.create({ text: 'Hello world', title: 'Test', author: 'User' });

    expect(analyzer).toHaveBeenCalledWith(analysis.tokenAst, 'Test', 'User');
    expect(analysis).toEqual(
      expect.objectContaining({
        id: 'ca_analysis-id',
        sourceId: 'usr_source-id',
        sourceType: 'user_text',
        sourceTextHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        modelUsed: 'gpt-oss-120b',
        providerUsed: 'cerebras',
        createdAt: '2026-07-21T12:00:00.000Z',
        updatedAt: '2026-07-21T12:00:00.000Z',
      }),
    );
    expect(analysis.meta).toEqual({ title: 'Test', author: 'User', theme: 'Greeting' });
    expect(repository.save).toHaveBeenCalledWith(analysis);
  });

  it('lists only user-text canvases through the repository contract', () => {
    const repository = new MemoryCanvasRepository();
    const service = makeService(repository);

    expect(service.list()).toEqual([]);
    expect(repository.listBySourceType).toHaveBeenCalledWith('user_text');
  });

  it('deletes existing sources and leaves missing sources untouched', () => {
    const repository = new MemoryCanvasRepository();
    const service = makeService(repository);
    repository.analyses.set('usr_1', {
      id: 'ca_1',
      sourceId: 'usr_1',
      sourceType: 'user_text',
      sourceTextHash: 'hash',
      tokenAst: { totalTokens: 0, sections: [] },
      annotations: [],
      layers: [],
      modelUsed: 'model',
      providerUsed: 'provider',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    });

    expect(service.delete('usr_1')).toBe(true);
    expect(service.delete('missing')).toBe(false);
    expect(repository.deleteBySourceId).toHaveBeenCalledTimes(1);
  });
});
