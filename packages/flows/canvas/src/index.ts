// Backend exports
export * from './backend/routes';
export * from './backend/repository';
export * from './backend/service';
export * from './backend/schemas';
export * from './backend/text-analyzer';

// Domain exports
export { expandAnnotations, type RawAnnotation } from './domain/annotations';
export { FlowError, CanvasAnalysisError } from './domain/errors';
export type { CanvasRepository } from './domain/ports';
