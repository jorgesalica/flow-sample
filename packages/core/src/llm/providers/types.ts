/**
 * LLM Types — Shared types for all LLM providers
 */

// ── Message & Request/Response ───────────────────────────────────────

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMRequest {
    messages: LLMMessage[];
    temperature?: number;
    maxTokens?: number;
    model?: string; // Optional override for default model
    streaming?: boolean; // Whether to stream the response
}

export interface LLMUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface LLMResponse {
    content: string;
    model: string;
    provider: string;
    usage: LLMUsage;
    latencyMs: number;
}

/** A single chunk yielded during streaming. */
export interface LLMStreamEvent {
    /** Text delta for this chunk (empty on final event). */
    delta: string;
    /** Whether this is the final event. */
    done: boolean;
    /** Full response, only present on the final event. */
    response?: LLMResponse;
}

// ── Model catalog ────────────────────────────────────────────────────

export type ModelTier = 'very_high' | 'high' | 'medium' | 'low';
export type ModelPricing = 'free' | 'paid';

export interface ModelInfo {
    id: string;
    name: string;
    tier: ModelTier;
    pricing: ModelPricing;
    contextWindow: number;
    description?: string;
}
