# Implementation Plan: Trading Bot Flow

This document serves as the index for the development iterations of the Trading Bot Flow.

## 📂 Iterations

### [Iteration 1: The Foundation](./iterations/it1-foundation.md) (✅ Completed)

**Focus**: Core architecture, real-time data pipeline, Fractal State Machine, Basic MVP Dashboard.

* **Nodes**: N1 (Watcher), N2 (Scribe), N3 (Navigator), N4 (Translator), N5 (Mentor), N6 (Dashboard).
* **Result**: Functional bot with live data, technical analysis, and basic LLM insights (Gemini Flash).

### [Iteration 2: The Insight Agent](./iterations/it2-insight-agent.md) (✅ Completed)

**Focus**: Enhancing the "Mentor" aspect (N5) to provide deep, non-generic, data-driven insights.

* **Key Upgrade**: Prompt Engineering 2.0 (Analysis Focus) + Context Transparency (Glass Box AI).
* **Model**: Upgrade from Gemini Flash to **Gemini 3 Flash**.
* **UX**: "Debug Context" in UI to show the raw data behind the insight.

### [Iteration 3: The Cascade Agent (Risk & Patterns)](./iterations/it3-cascade-agent.md) (✅ Completed)

**Focus**: Implementing the mathematical foundation for "Top-Down" analysis (Fractal, Patterns) and Risk Management.

* **Math**: Candle Pattern Recognition (Engulfing, Pinbar) + Touch Count Logic.
* **UI**: Bias Badge (LONG/SHORT) + Risk Box (Stop Loss/Take Profit).
* **Synthesis**: Enriching LLM context with specific pattern data.

### [Iteration 4: The Cascade Wizard](./iterations/it4-cascade-wizard.md) (✅ Completed)

**Focus**: Creating a guided, multi-timeframe "Wizard" experience (1D → 4H → 1H → 15m) for deep-dive analysis.

* **UI**: `StepWizard` component with interactive charts for each timeframe.
* **Logic**: **Matrioshka Prompting** (passing context from macro to micro).
* **Data**: Local Timezone support + Variable Kline Limit fetching.
* **Doc**: Comprehensive [Experience Flow](../cascade-wizard-experience-flow.md).

---

## 🛠️ Global Backlog & History

* [Backlog](./flow-backlog.md) - Task tracking across all iterations.
* [History](./flow-history.md) - Chronological log of changes.
