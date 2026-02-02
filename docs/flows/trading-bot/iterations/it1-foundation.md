# Implementation Plan: Trading Bot Flow (Iteration 1: Foundation)

> **Status**: Completed ✅
> **Goal**: Establish real-time data pipeline, Fractal State Machine, and Basic MVP Dashboard.

## 📐 Codebase Context

The project follows a monorepo structure with clean architecture:

```text
packages/
├── backend/src/
│   ├── api/           # Elysia HTTP routes (app.ts, *.routes.ts)
│   ├── application/   # Use cases (spotify.usecase.ts)
│   ├── domain/        # Business entities
│   ├── infrastructure/
│   │   ├── adapters/  # External services (llm/, lrclib/, spotify-api/)
│   │   ├── persistence/sqlite/  # database.ts (flow.db)
│   │   └── repositories/
│   └── cli/
├── shared/            # Shared types
└── ui/src/lib/
    ├── flows/         # Flow-specific UI (spotify.ts, lyrics.ts)
    └── pages/
```

---

## 🚀 Phase 1: The Foundation (N1 + N2)

> **Goal**: Establish real-time data pipeline from Binance to local SQLite.

### 1.1 Database Schema (`trading.db`)

| Task | Details |
| --- | --- |
| **File** | `packages/backend/src/infrastructure/persistence/sqlite/trading-database.ts` |
| **Action** | Create new file. Initialize `better-sqlite3` connection to `data/trading.db`. |
| **Schema** | Create tables: `candles`, `fractal_nodes`, `advisor_logs`. |

### 1.2 Binance WebSocket Adapter (N1)

| Task | Details |
| --- | --- |
| **Action** | Implement WebSocket client using `ws` package. |
| **Logic** | Connect to `wss://stream.binance.com:9443/ws/<symbol>@kline_<interval>`. |

### 1.3 Trading Service (Orchestrator)

| Task | Details |
| --- | --- |
| **Action** | Create service that orchestrates N1 -> N2 flow. |

---

## 🧠 Phase 2: The Navigator (N3)

> **Goal**: Implement the Fractal State Machine (Hurst, Fractals, Conditional Indicators).

### 2.1 Math Utilities

| Task | Details |
| --- | --- |
| **Files** | `hurst.ts`, `fractals.ts` |
| **Logic** | Implement R/S algorithm (Hurst) and Bill Williams 5-bar fractal detection. |

### 2.2 Analyst Service (N3)

| Task | Details |
| --- | --- |
| **Action** | Create the core "State Machine" (Regime detection, etc). |

---

## 🗣️ Phase 3: The Advisor (N4 + N5)

> **Goal**: Synthesize context and generate LLM-powered educational insights.

### 3.1 LLM Layer

| Task | Details |
| --- | --- |
| **Action** | Create provider-agnostic abstraction using `@google/genai`. |

### 3.2 Mentor Service

| Task | Details |
| --- | --- |
| **Action** | Orchestrate N4 → LLM → Response parsing. |

---

## 📺 Phase 4: The Dashboard (N6)

> **Goal**: Visualize the flow in the Svelte UI.

### 4.1 UI Store & Pages

| Task | Details |
| --- | --- |
| **Action** | Create Svelte store and TradingPage with Chart, RegimeWidget, and InsightCard. |

---

## 📅 Phase Summary

| Phase | Nodes | Status |
| --- | --- | --- |
| **Phase 1** | N1, N2 | ✅ Completed |
| **Phase 2** | N3 | ✅ Completed |
| **Phase 3** | N4, N5 | ✅ Completed |
| **Phase 4** | N6 | ✅ Completed |
