import {
  deleteAnalysisBySourceId,
  findAnalysisBySourceId,
  getAllAnalysesBySourceType,
  saveAnalysis,
} from '@flows/analysis';
import type { CanvasAnalysis, CanvasSourceType } from '@flows/shared';
import type { CanvasRepository } from '../domain/ports';

export class AnalysisCanvasRepository implements CanvasRepository {
  findBySourceId(sourceId: string): CanvasAnalysis | null {
    return findAnalysisBySourceId(sourceId);
  }

  listBySourceType(sourceType: CanvasSourceType): CanvasAnalysis[] {
    return getAllAnalysesBySourceType(sourceType);
  }

  save(analysis: CanvasAnalysis): void {
    saveAnalysis(analysis);
  }

  deleteBySourceId(sourceId: string): void {
    deleteAnalysisBySourceId(sourceId);
  }
}
