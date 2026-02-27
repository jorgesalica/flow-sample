/**
 * Domain-specific errors for Trading Flow
 */

export class TradingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TradingError';
  }
}

export class InsufficientDataError extends TradingError {
  constructor(message: string = 'Insufficient data for analysis') {
    super(message);
    this.name = 'InsufficientDataError';
  }
}

export class LLMQuotaError extends TradingError {
  constructor(message: string = 'LLM quota exceeded or rate limited') {
    super(message);
    this.name = 'LLMQuotaError';
  }
}

export class AnalysisError extends TradingError {
  constructor(message: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}
