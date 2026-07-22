# Iteration 4: The Cascade Wizard 🧙‍♂️

> **Goal**: Transform the Trading Dashboard into a step-by-step analysis wizard that mirrors the user's manual trading workflow: **1D → 4H → 1H → 15m**.

## Overview

Each step displays:

1. **Candlestick Chart** for that timeframe (using `lightweight-charts`)
2. **Metrics Panel** with Hurst, S/R levels, and patterns
3. **LLM Insight** tailored to that analysis level

The user navigates through steps, building context from Macro to Micro.

---

## Technical Requirements

### 1. Multi-Timeframe Data (Backend)

| Endpoint                                                       | Purpose                                   |
| -------------------------------------------------------------- | ----------------------------------------- |
| `GET /api/trading/klines?symbol=BTCUSDT&interval=1d&limit=100` | Fetch historical klines for any timeframe |

**Implementation:**

- Create `binance-rest.ts` adapter with `fetchKlines(symbol, interval, limit)`.
- Calls Binance REST API: `https://api.binance.com/api/v3/klines`.
- Exposes via new route in `trading.routes.ts`.

### 2. Candlestick Chart Component (Frontend)

**Dependencies:**

```bash
pnpm add lightweight-charts svelte-lightweight-charts
```

**Component:** `CandleChart.svelte`

- Props: `candles`, `supportLevel?`, `resistanceLevel?`
- Renders interactive candlestick chart with S/R overlays.

### 3. Step Wizard UI (Frontend)

**Steps:**

| Step | Timeframe | Focus                |
| ---- | --------- | -------------------- |
| 1    | 1D        | Macro Bias           |
| 2    | 4H        | Structure Validation |
| 3    | 1H        | Setup Confirmation   |
| 4    | 15m       | Entry Signal         |

**UI Flow:**

```
[ Step 1: Daily ] → [ Step 2: 4H ] → [ Step 3: 1H ] → [ Step 4: 15m ]
       ↓                  ↓                ↓                ↓
    Chart             Chart            Chart            Chart
    Metrics           Metrics          Metrics          Metrics
    Insight           Insight          Insight          Insight
```

---

## User Flow

1. User clicks "Start Analysis Wizard" on Trading Dashboard.
2. **Step 1 (1D)**: System fetches 1D candles, analyzes, shows chart + insight.
   - LLM focuses on: "Is this a trending or ranging market on the daily?"
3. User clicks "Next →".
4. **Step 2 (4H)**: Fetches 4H candles, shows chart + insight.
   - LLM focuses on: "What structure levels are forming on 4H?"
5. Repeat for 1H and 15m.
6. **Final Summary**: Shows combined bias (from all steps) and trade recommendation.

---

## Files to Create/Modify

### Backend

| File                | Change                                |
| ------------------- | ------------------------------------- |
| `binance-rest.ts`   | **[NEW]** REST client for Binance API |
| `trading.routes.ts` | Add `/klines` endpoint                |

### Frontend

| File                 | Change                                         |
| -------------------- | ---------------------------------------------- |
| `CandleChart.svelte` | **[NEW]** Candlestick chart component          |
| `StepWizard.svelte`  | **[NEW]** Step wizard container                |
| `TradingFlow.svelte` | Integrate wizard into existing page            |
| `trading.ts`         | Add `fetchKlines` function for multi-timeframe |

---

## Scope Clarification

> [!IMPORTANT]
> Phase 1 focuses on **visual analysis** only. The LLM generates an insight per timeframe but does NOT execute trades.

---

## Verification Plan

1. **Backend**: Call `/api/trading/klines?interval=1d` and verify JSON response.
2. **Chart**: Render 1D candles in `CandleChart.svelte`, visually confirm.
3. **Wizard**: Navigate through all 4 steps, verify each timeframe loads correctly.
4. **Insights**: Generate insight for each step, verify LLM response is contextual.
