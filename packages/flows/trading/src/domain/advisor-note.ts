import type { AdvisorNote, SentimentBias } from '@flows/shared';

const SENTIMENT_BIASES = new Set<SentimentBias>(['LONG', 'SHORT', 'NEUTRAL']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRiskManagement(value: unknown): AdvisorNote['risk_management'] {
  if (!isRecord(value)) return undefined;

  const recommendedStop = Number(value.recommended_sl);
  if (!Number.isFinite(recommendedStop)) return undefined;

  return {
    recommended_sl: recommendedStop,
    invalidation_reason:
      typeof value.invalidation_reason === 'string'
        ? value.invalidation_reason
        : 'Structural level',
  };
}

export function parseAdvisorNote(content: string): AdvisorNote | null {
  try {
    const clean = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const json = clean.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (
      !isRecord(parsed) ||
      typeof parsed.title !== 'string' ||
      typeof parsed.mentor_tip !== 'string'
    ) {
      return null;
    }

    const sentiment =
      typeof parsed.sentiment_bias === 'string' &&
      SENTIMENT_BIASES.has(parsed.sentiment_bias as SentimentBias)
        ? (parsed.sentiment_bias as SentimentBias)
        : undefined;

    return {
      title: parsed.title,
      sentiment_bias: sentiment,
      regime_context:
        typeof parsed.regime_context === 'string' ? parsed.regime_context : '',
      scenario_bullish:
        typeof parsed.scenario_bullish === 'string' ? parsed.scenario_bullish : '',
      scenario_bearish:
        typeof parsed.scenario_bearish === 'string' ? parsed.scenario_bearish : '',
      risk_management: parseRiskManagement(parsed.risk_management),
      mentor_tip: parsed.mentor_tip,
      reasoning_key_factors: Array.isArray(parsed.reasoning_key_factors)
        ? parsed.reasoning_key_factors.filter(
            (factor): factor is string => typeof factor === 'string',
          )
        : [],
      confidence_score:
        typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 50,
    };
  } catch {
    return null;
  }
}
