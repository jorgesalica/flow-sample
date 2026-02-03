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

---

## 🛠️ Global Backlog & History

* [Backlog](./flow-backlog.md) - Task tracking across all iterations.
* [History](./flow-history.md) - Chronological log of changes.
