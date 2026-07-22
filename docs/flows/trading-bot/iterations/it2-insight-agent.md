# Iteration 2: The Insight Agent (Deep Reasoning)

> **Status**: In Progress 🚧
> **Goal**: Transform the "Mentor" from a generic advice generator into a data-driven, transparent market analyst using advanced Prompt Engineering and transparent AI UX.

## 🧠 Core Objectives

1. **Stop the Fluff**: Eliminate generic advice ("set stop losses"). Insights must be specific to current price/fractals.
2. **Glass Box AI**: Show the user exactly _what_ data the AI analyzed. Build trust.
3. **Deep Reasoning**: Using **Gemini 3 Flash** to correlate multiple indicators (Hurst + Nodes + Divergences) instead of reading them in isolation.

---

## 🛠️ Implementation Tasks

### 2.1 Model & Configuration Upgrade

| Task       | Details                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| **File**   | `.env`, `trading.config.ts`, `gemini-provider.ts`                                                              |
| **Action** | Switch default model to `gemini-3-flash` (State of the Art) for better reasoning.                              |
| **Why?**   | The latest Gemini model excels at complex instruction following and nuance, critical for specialized analysis. |
| **Config** | Ensure `TRADING_CONFIG` has parameters for nuanced generation (lower temperature ~0.3 for analysis).           |

### 2.2 Prompt Engineering 2.0 (Data-Driven)

| Task           | Details                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**       | `synthesizer.service.ts` (N4)                                                                                                                                                                                                                                                                     |
| **Action**     | completely rewrite `MENTOR_SYSTEM_PROMPT`.                                                                                                                                                                                                                                                        |
| **Rules**      | 1. **No generic advice**: If you say "resistance", cite the PRICE (e.g., "Resistance at 98,500"). 2. **Reasoning Steps**: Force the model to "think" about the correlation between Hurst (Regime) and Fractals (Structure). 3. **Persona**: Analytic Quantitative Researcher, not a "Life Coach". |
| **Input Data** | Enrich the `MarketState` JSON sent to LLM. Add calculated distances to nearest support/resistance explicitly to help the LLM math.                                                                                                                                                                |

### 2.3 UI Transparency (Glass Box)

| Task        | Details                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------ |
| **File**    | `TradingPage.svelte`, `InsightCard.svelte`                                                 |
| **Action**  | Add a "Context / Debug" accordion below the Insight Card.                                  |
| **Content** | Display the JSON payload that was sent to the LLM.                                         |
| **Why?**    | "Don't trust, verify". Users should see: "Ah, the AI said Trending because Hurst is 0.75". |

### 2.4 Output Structure Redesign

| Task           | Details                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **File**       | `advisor.types.ts`, `mentor.service.ts`                                                                      |
| **Action**     | Update `AdvisorNote` interface.                                                                              |
| **New Fields** | Add `reasoning_key_factors` (array of strings, e.g., ["Hurst > 0.6", "Price > EMA20"]) to structured output. |

---

## 📅 Execution Plan

- [x] **Step 1**: Update `AdvisorNote` interface and database schema if adding new fields. <!-- id: it2-1 -->
- [x] **Step 2**: Refactor `SynthesizerService` with the new System Prompt and enriched Market Data construction. <!-- id: it2-2 -->
- [x] **Step 3**: Update `.env` / Config to use **Gemini 3 Pro**. <!-- id: it2-3 -->
- [x] **Step 4**: Update Frontend (`InsightCard.svelte`) to show new fields and "Debug Context" accordion. <!-- id: it2-4 -->
- [x] **Step 5**: Verification: Generate insight and verify specificity. <!-- id: it2-5 -->

---

## 🧪 Verification Criteria

- **Specificity**: Insight MUST mention specific price levels (e.g., "$102,300") found in the fractal nodes.
- **Relevance**: Tip must relate to the _current_ regime (e.g., "In this mean-reverting regime, look for entries at boundaries", NOT "Always trend follow").
- **Transparency**: Clicking "Show Context" in UI reveals the exact JSON data.
