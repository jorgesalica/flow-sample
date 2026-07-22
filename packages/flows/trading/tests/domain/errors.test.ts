import { describe, it, expect } from 'vitest';
import {
  TradingError,
  InsufficientDataError,
  LLMQuotaError,
  AnalysisError,
} from '../../src/domain/errors';

describe('trading domain errors', () => {
  it('TradingError carries its message and name', () => {
    const e = new TradingError('boom');
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('boom');
    expect(e.name).toBe('TradingError');
  });

  it('InsufficientDataError defaults its message and extends TradingError', () => {
    const e = new InsufficientDataError();
    expect(e).toBeInstanceOf(TradingError);
    expect(e.message).toBe('Insufficient data for analysis');
    expect(e.name).toBe('InsufficientDataError');
  });

  it('InsufficientDataError accepts a custom message', () => {
    expect(new InsufficientDataError('not enough candles').message).toBe('not enough candles');
  });

  it('LLMQuotaError defaults its message and extends TradingError', () => {
    const e = new LLMQuotaError();
    expect(e).toBeInstanceOf(TradingError);
    expect(e.message).toBe('LLM quota exceeded or rate limited');
    expect(e.name).toBe('LLMQuotaError');
  });

  it('LLMQuotaError accepts a custom message', () => {
    expect(new LLMQuotaError('429 from provider').message).toBe('429 from provider');
  });

  it('AnalysisError carries its message and name', () => {
    const e = new AnalysisError('regime detection failed');
    expect(e).toBeInstanceOf(TradingError);
    expect(e.message).toBe('regime detection failed');
    expect(e.name).toBe('AnalysisError');
  });
});
