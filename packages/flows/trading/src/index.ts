// @flows/trading — Trading Flow Package

// Backend exports
export {
    createTradingRoutes,
    createTradingRouteDependencies,
    type TradingRoutesDependencies,
    type TradingStreamApplication,
    type TradingMentorApplication,
} from './backend/routes';
export {
    getTradingService,
    getMentorService,
    getSynthesizerService,
    AnalystService,
    TradingMarketService,
    TradingWizardService,
    type TradingMarketApplication,
    type TradingWizardApplication,
} from './backend/services';
export {
    SqliteTradingReadRepository,
    type TradingReadRepository,
    type StoredAdvisorInsight,
} from './backend/repository';
export {
  createTradingConfigFromEnv,
  TRADING_CONFIG,
  type TradingConfig,
  type TradingRuntimeConfig,
} from './backend/config';

// Domain math exports
export {
    calculateHurst,
    classifyRegime,
    calculateFractalDimension,
    detectFractals,
    getRecentFractals,
    findNearestResistance,
    findNearestSupport,
    calculateTouchCounts,
    detectCandlePatterns,
    summarizeCandlePatterns,
    type Candle,
    type FractalNode,
    type FractalWithTouches,
    type MarketRegime,
    type CandlePattern,
} from './domain/math';

// Domain types (only re-export non-conflicting ones)
export type {
    MarketState,
    RegimeType,
    CandlePatternInfo,
    SentimentBias,
    RiskManagement,
    AdvisorNote,
    AdvisorState,
} from './domain/types';

// Domain errors
export {
    TradingError,
    InsufficientDataError,
    LLMQuotaError,
    AnalysisError,
    MarketDataUnavailableError,
    InsightProviderError,
    InvalidInsightResponseError,
} from './domain/errors';

// Adapter exports
export { BinanceStream, fetchKlines, type KlineInterval } from './adapters/binance';
