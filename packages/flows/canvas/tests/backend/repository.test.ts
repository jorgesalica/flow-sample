import { describe, expect, it, vi } from 'vitest';
import type { AnalysisRepository } from '@flows/analysis';
import type { CanvasAnalysis } from '@flows/shared';
import { AnalysisCanvasRepository } from '../../src/backend/repository';
import { createCanvasFlowApplication } from '../../src/backend/routes';

const analysis: CanvasAnalysis = {
  id: 'canvas-1',
  sourceId: 'source-1',
  sourceType: 'user_text',
  sourceTextHash: 'hash',
  tokenAst: { sections: [], totalTokens: 0 },
  annotations: [],
  layers: [],
  modelUsed: 'test-model',
  providerUsed: 'test-provider',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeRepository(): AnalysisRepository {
  return {
    findBySourceId: vi.fn(() => analysis),
    listBySourceType: vi.fn(() => [analysis]),
    save: vi.fn(),
    deleteBySourceId: vi.fn(),
  };
}

describe('AnalysisCanvasRepository', () => {
  it('adapts every Canvas persistence operation to Analysis', () => {
    const analysisRepository = makeRepository();
    const repository = new AnalysisCanvasRepository(analysisRepository);

    expect(repository.findBySourceId('source-1')).toBe(analysis);
    expect(repository.listBySourceType('user_text')).toEqual([analysis]);
    repository.save(analysis);
    repository.deleteBySourceId('source-1');

    expect(analysisRepository.findBySourceId).toHaveBeenCalledWith('source-1');
    expect(analysisRepository.listBySourceType).toHaveBeenCalledWith('user_text');
    expect(analysisRepository.save).toHaveBeenCalledWith(analysis);
    expect(analysisRepository.deleteBySourceId).toHaveBeenCalledWith('source-1');
  });

  it('composes the Canvas application with an injected Analysis repository', () => {
    const application = createCanvasFlowApplication(makeRepository());

    expect(application.get('source-1')).toBe(analysis);
    expect(application.list()).toEqual([analysis]);
  });
});
