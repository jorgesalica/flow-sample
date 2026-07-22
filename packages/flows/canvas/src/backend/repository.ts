import type { AnalysisRepository } from '@flows/analysis';
import type { CanvasAnalysis, CanvasSourceType } from '@flows/shared';
import type { CanvasRepository } from '../domain/ports';

export class AnalysisCanvasRepository implements CanvasRepository {
  constructor(private readonly repository: AnalysisRepository) {}

  findBySourceId(sourceId: string): CanvasAnalysis | null {
    return this.repository.findBySourceId(sourceId);
  }

  listBySourceType(sourceType: CanvasSourceType): CanvasAnalysis[] {
    return this.repository.listBySourceType(sourceType);
  }

  save(analysis: CanvasAnalysis): void {
    this.repository.save(analysis);
  }

  deleteBySourceId(sourceId: string): void {
    this.repository.deleteBySourceId(sourceId);
  }
}
