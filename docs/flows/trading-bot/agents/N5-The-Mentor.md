# Agent Profile: N5 - The Mentor (El Capitán)

> **Role**: Educational Trading Advisor (On-Demand)  
> **Type**: Large Language Model (LLM)  
> **Location**: Node 5 in the Trading Flow  
> **Activation**: User-controlled toggle (not always-on)

---

## 🤖 Model Specification

| Parameter | Value |
|---|---|
| **Model ID** | `gemini-3-flash` |
| **Provider** | Google DeepMind |
| **Context Window** | 1M tokens (typical usage: < 2k) |
| **Input Cost** | $0.50 per 1M tokens |
| **Output Cost** | $3.00 per 1M tokens |
| **Latency** | ~1.5s for 500-token response |

---

## 💡 Decision Rationale

### Why Gemini 3 Flash?

| Factor | Justification |
|---|---|
| **Activation Model** | **On-Demand** (user toggles advisor on/off). Not always-on. |
| **Real Usage Pattern** | User decides when to activate. Typical: 1-4 hours/day during active trading windows. |
| **Cost (1 hour/day)** | `60 req × (800 × $0.50 + 500 × $3.00) / 1M = $0.11/day = **$3.30/month**` |
| **Cost (4 hours/day)** | `240 req × ... = **$0** (within 250/day free tier)` ✅ |
| **Cost (8 hours/day)** | `480 req × ... = $0.70/day = **$21/month**` |
| **Speed** | Flash: ~1.5s. Pro: ~3-4s. We need insights delivered **within the 1-minute window**. |
| **Capability** | Flash handles structured JSON interpretation and templated reasoning excellently. Pro's extra reasoning is overkill for this task. |

**Alternative Considered**:

- **Gemini 3 Pro** ($2.00/$12.00 per 1M tokens) — Rejected due to cost and latency.
- **Groq Llama 3.1 8B** ($0.05/$0.08 per 1M tokens) — **Best for 24/7 use**: `1440 req/day = $3.60/month`, but Flash is free for <4h/day.

**Recommendation**: Start with **Gemini 3 Flash** (free for typical usage). Swap to Groq if you exceed 4h/day consistently.

---

## 🧠 Cognitive Function

### Input Schema (JSON)

The system sends a structured market digest to the LLM. No ambiguity, no prose.

```json
{
  "timestamp": "2026-01-31T21:45:00Z",
  "symbol": "BTCUSDT",
  "current_price": 98200.50,
  "regime": {
    "classification": "TRENDING",
    "hurst_exponent": 0.72,
    "fractal_dimension": 1.28,
    "interpretation": "Persistent trend (H > 0.6). Mean reversion unlikely."
  },
  "fractal_nodes": [
    {
      "price": 98200,
      "type": "RESISTANCE",
      "timeframe": "1h",
      "strength": "strong",
      "distance_pct": 0.001
    }
  ],
  "indicators": {
    "rsi": {
      "value": 72,
      "zone": "overbought",
      "regime_adjusted_interpretation": "In TRENDING regime, high RSI confirms momentum, not reversal."
    },
    "macd": {
      "signal": "bullish_cross",
      "histogram": 45.2
    }
  }
}
```

---

### System Prompt (Instruction)

```
You are El Capitán, a professional trading mentor AI. Your role is educational, not prescriptive.

TASK:
Analyze the provided market state JSON and generate a structured trading insight.

GUIDELINES:
1. CONTEXTUALIZE: Explain what the current market regime means for indicator interpretation.
2. EDUCATE: Clarify why certain signals are valid or invalid given the regime.
3. SCENARIO ANALYSIS: Present both bullish and bearish possibilities with clear trigger conditions.
4. ACTIONABLE: Tell the user what price levels or confirmations to watch for.
5. TONE: Professional, calm, data-driven. No hype, no fear-mongering.

OUTPUT FORMAT:
Return a JSON object with the following structure:
{
  "title": "Short headline (e.g., 'Bullish Momentum at Resistance')",
  "regime_context": "Explanation of current regime and what it means",
  "key_observation": "Main market event happening right now",
  "scenario_bullish": {
    "condition": "What needs to happen for bullish continuation",
    "target": "Expected price level if bullish",
    "reasoning": "Why this scenario is plausible"
  },
  "scenario_bearish": {
    "condition": "What would trigger bearish reversal",
    "target": "Expected price level if bearish",
    "reasoning": "Why this scenario is possible"
  },
  "mentor_tip": "Educational insight or common mistake to avoid"
}
```

---

### Example Output (LLM Response)

```json
{
  "title": "Bullish Momentum Testing 1h Resistance",
  "regime_context": "We are in a TRENDING regime with Hurst 0.72 (persistent directional movement). In this environment, traditional 'overbought' signals often fail because momentum can sustain for extended periods.",
  "key_observation": "Price is currently testing the 1h fractal resistance at 98,200. This level has rejected price twice in the past 4 hours.",
  "scenario_bullish": {
    "condition": "Clean candle close above 98,250 with volume confirmation",
    "target": "98,800 (next fractal resistance)",
    "reasoning": "Breaking this resistance in a trending regime typically leads to continuation, as buyers have already absorbed sellers at lower levels."
  },
  "scenario_bearish": {
    "condition": "Price spikes above 98,200 but closes below it (bearish wick/rejection)",
    "target": "97,600 (nearest support fractal)",
    "reasoning": "A fakeout at resistance can trigger stop-loss cascades from breakout traders, causing sharp pullbacks."
  },
  "mentor_tip": "Don't short just because RSI is 72. In trending markets, RSI can stay elevated for hours. Wait for clear price rejection (bearish wick) before considering counter-trend trades."
}
```

---

## 🔄 Lifecycle

1. **Trigger**: N4 (Synthesizer) detects `CANDLE_CLOSED` event → Builds JSON input.
2. **Inference**: Gemini 3 Flash processes request (~1.5s).
3. **Parsing**: Backend validates JSON response schema.
4. **Distribution**: Structured insight sent to N6 (Dashboard) for rendering.
5. **Persistence**: Raw JSON logged to `advisor_logs` table with `timestamp`, `regime`, and `insight_json`.

---

## 📊 Cost Projection (On-Demand Usage)

> **Key Reality**: The app only fetches data while running, and the advisor only generates insights when the user enables it.

### Realistic Usage Scenarios

| Usage Pattern | Requests/Day | Gemini 3 Flash Cost | Groq Llama 8B Cost |
|---|---|---|---|
| **1 hour/day** | 60 | **$0** (free tier: 250/day) | $0.005/day ($0.15/mo) |
| **2 hours/day** | 120 | **$0** (free tier) | $0.01/day ($0.30/mo) |
| **4 hours/day** | 240 | **$0** (free tier) ✅ | $0.02/day ($0.60/mo) |
| **6 hours/day** | 360 | $0.33/day ($10/mo) | $0.03/day ($0.90/mo) |
| **8 hours/day** | 480 | $0.70/day ($21/mo) | $0.04/day ($1.20/mo) |
| **12 hours/day** | 720 | $1.40/day ($42/mo) | $0.06/day ($1.80/mo) |
| **24 hours/day** (unlikely) | 1440 | $2.74/day ($82/mo) | $0.12/day ($3.60/mo) |

**Calculation Base**:

- Input: 800 tokens/request (market state JSON)
- Output: 500 tokens/request (insight JSON)
- Gemini 3 Flash: $0.50/M input, $3.00/M output, 250 req/day free tier
- Groq Llama 3.1 8B: $0.05/M input, $0.08/M output, no free tier

**Recommendation for Most Users**:
**Gemini 3 Flash** (free for ≤4h/day). If you consistently use >4h/day, consider **Groq** for predictable low costs.
