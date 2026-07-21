import type { CanvasAnalysis, CanvasSourceType } from '@flows/shared';

export interface CanvasRepository {
  findBySourceId(sourceId: string): CanvasAnalysis | null;
  listBySourceType(sourceType: CanvasSourceType): CanvasAnalysis[];
  save(analysis: CanvasAnalysis): void;
  deleteBySourceId(sourceId: string): void;
}
