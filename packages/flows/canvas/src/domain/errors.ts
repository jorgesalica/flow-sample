/**
 * Base error for all flow errors
 */
export class FlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlowError';
  }
}

/**
 * Canvas text analysis failed (e.g. the LLM could not produce a result)
 */
export class CanvasAnalysisError extends FlowError {
  constructor(message: string = 'Canvas text analysis failed') {
    super(message);
    this.name = 'CanvasAnalysisError';
  }
}
