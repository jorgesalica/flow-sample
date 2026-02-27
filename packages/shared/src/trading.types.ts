/**
 * Trading Flow Types
 *
 * Consolidated from backend domain + UI duplicates.
 * Single source of truth for all trading-related types.
 */

// ============================================
// Market Data
// ============================================

export interface Candle {
    symbol: string;
    interval: string;
    openTime: number;
    closeTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    isClosed: boolean;
}

export interface FractalNode {
    type: 'high' | 'low';
    price: number;
    candleOpenTime: number;
}

export type RegimeType = 'TRENDING' | 'RANGING' | 'MEAN_REVERTING' | 'RANDOM';

export interface CandlePatternInfo {
    name: string;
    type: 'bullish' | 'bearish' | 'neutral';
    significance: 'strong' | 'moderate' | 'weak';
}

export interface MarketState {
    symbol: string;
    timestamp: number;
    regime: RegimeType;
    hurst: number;
    fractalDimension: number;
    price: {
        current: number;
        open24h?: number;
        change24h?: number;
    };
    nodes: {
        all: FractalNode[];
        support: FractalNode | null;
        resistance: FractalNode | null;
        supportTouchCount?: number;
        resistanceTouchCount?: number;
    };
    indicators: {
        rsi?: number;
        macd?: {
            value: number;
            signal: number;
            histogram: number;
        };
    };
    /** Detected candle patterns in recent price action */
    candlePatterns?: CandlePatternInfo[];
}

// ============================================
// Advisor / LLM
// ============================================

export type SentimentBias = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface RiskManagement {
    recommended_sl: number;
    invalidation_reason: string;
}

export interface AdvisorNote {
    title: string;
    sentiment_bias?: SentimentBias;
    regime_context: string;
    scenario_bullish: string;
    scenario_bearish: string;
    risk_management?: RiskManagement;
    mentor_tip: string;
    reasoning_key_factors: string[];
    confidence_score: number;
}

// ============================================
// UI State
// ============================================

export interface TradingState {
    isRunning: boolean;
    symbol: string;
    interval: string;
    lastCandle: Candle | null;
    candleCount: number;
    connectedAt: string | null;
}

export interface AdvisorState {
    isEnabled: boolean;
    lastInsightAt: string | null;
    insightCount: number;
}
