# Iteration 3: The Cascade Agent 🌊 (N3 + N5 Upgrade)

**Focus**: Aligning the bot's "brain" with the user's manual "top-down" trading strategy.
**Goal**: Move from a single "Snapshot Analysis" to a sequential **"Cascade Analysis"** (1D → 4H → 1H → 15m) with candle pattern recognition.

---

## 🎯 Objectives

1. **See Like a Trader**: Implement detection of **Candlestick Patterns** (Hammer, Engulfing, Doji) and **Structure Touches** (support/resistance validaton).
2. **Think Like a Trader**: Refactor `MentorService` to use a **Chain of Thought (CoT)** approach, analyzing macro context before micro execution.
3. **Manage Risk**: Suggest **Structural Stop Loss** and calculate **R:R Ratio** dynamically in the insight.

---

## 🛠️ Technical Plan

### 1. The "Eyes" (Pattern Recognition) - N3 Navigator Upgrade

_New capabilities in `AnalystService` and `math.ts` to feed the LLM._

- **Candle Pattern Engine**:
  - Implement logic to detect: `Hammer` (rejection), `Engulfing` (momentum), `Doji` (indecision).
  - Input: Last 3-5 candles. Output: Pattern Name + Significance (Bullish/Bearish).
- **Touch Counting**:
  - Algorithm to count how many times price has reacted to a fractal level in the past.
  - Output: `fractal.touchCount` (e.g., 3 = Strong Support).

### 2. The "Brain" (Cascade Logic) - N5 Mentor Upgrade

_Refactoring `MentorService` to orchestrate multi-step reasoning._

**Old Flow**:
`MarketState` -> `Synthesizer` -> `LLM` -> `Insight`

**New Cascade Flow**:

1. **Step 1 (Macro)**: Analyze Daily Trend (EMA 200 simulation using recent history) + Big Levels.
   - _Output_: Bias (Long/Short/Neutral).
2. **Step 2 (Structure)**: Analyze H1 Structure (3-Touch Levels, Fractales).
   - _Output_: Key Levels + Potential Setup.
3. **Step 3 (Entry/Risk)**: Analyze 15m Patterns + Risk Math.
   - _Output_: Final Insight with SL/Take Profit zones.

_Note: For latency reasons, we might combine these into a Single Prompt with "Chain of Thought" instructions, rather than 3 separate API calls, unless detailed interim steps are needed._

### 3. The Output (AdvisorNote 2.0)

Updated Interface for UI consumption:

```typescript
interface AdvisorNote {
  // ... existing fields ...

  sentiment_bias: 'LONG' | 'SHORT' | 'NEUTRAL';

  risk_management: {
    recommended_sl: number; // Price
    recommended_tp: number; // Price (1R)
    risk_reward_ratio: number;
    invalidation_reason: string; // "Below swing low"
  };

  structural_validation: {
    pattern_detected: string | null; // "Bullish Hammer"
    confluence_score: number; // 0-100
  };
}
```

---

## 📋 Implementation Tasks

- [ ] **Math Lib**: Add `detectCandlePatterns(candles)` function.
- [ ] **Math Lib**: Update `detectFractals` to calculate `touchCount`.
- [ ] **Synthesizer**: Update `enrichMarketState` to include new patterns and touch counts.
- [ ] **Mentor**: Update `MENTOR_SYSTEM_PROMPT` to enforce "Cascade Thinking" (Macro -> Micro).
- [ ] **UI**: Update `TradingFlow.svelte` to display Sentiment Bias and Risk Box.

---
