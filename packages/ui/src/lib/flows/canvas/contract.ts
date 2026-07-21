import type {
  Annotation,
  AnnotationLayer,
  CanvasAnalysis,
  CanvasSourceType,
  Section,
  Token,
  TokenAST,
} from '@flows/shared';

const CANVAS_SOURCE_TYPES: Readonly<Record<CanvasSourceType, true>> = {
  track: true,
  user_text: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCanvasSourceType(value: unknown): value is CanvasSourceType {
  return typeof value === 'string' && Object.hasOwn(CANVAS_SOURCE_TYPES, value);
}

function isToken(value: unknown): value is Token {
  return isRecord(value) && typeof value.id === 'string' && typeof value.text === 'string';
}

function isSection(value: unknown): value is Section {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    Array.isArray(value.lines) &&
    value.lines.every((line) => Array.isArray(line) && line.every(isToken))
  );
}

function isTokenAst(value: unknown): value is TokenAST {
  return (
    isRecord(value) &&
    Array.isArray(value.sections) &&
    value.sections.every(isSection) &&
    typeof value.totalTokens === 'number' &&
    Number.isSafeInteger(value.totalTokens) &&
    value.totalTokens >= 0
  );
}

function isAnnotation(value: unknown): value is Annotation {
  return (
    isRecord(value) &&
    typeof value.tokenId === 'string' &&
    typeof value.layerId === 'string' &&
    typeof value.label === 'string' &&
    typeof value.detail === 'string'
  );
}

function isAnnotationLayer(value: unknown): value is AnnotationLayer {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.color === 'string'
  );
}

export function isCanvasAnalysis(value: unknown): value is CanvasAnalysis {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sourceId === 'string' &&
    isCanvasSourceType(value.sourceType) &&
    typeof value.sourceTextHash === 'string' &&
    isTokenAst(value.tokenAst) &&
    Array.isArray(value.annotations) &&
    value.annotations.every(isAnnotation) &&
    Array.isArray(value.layers) &&
    value.layers.every(isAnnotationLayer) &&
    (value.meta === undefined || isRecord(value.meta)) &&
    typeof value.modelUsed === 'string' &&
    typeof value.providerUsed === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function parseCanvasAnalysis(value: unknown): CanvasAnalysis {
  if (!isCanvasAnalysis(value)) throw new Error('Invalid canvas response');
  return value;
}

export function parseCanvasAnalysisList(value: unknown): CanvasAnalysis[] {
  if (!Array.isArray(value) || !value.every(isCanvasAnalysis)) {
    throw new Error('Invalid canvas list response');
  }
  return value;
}
