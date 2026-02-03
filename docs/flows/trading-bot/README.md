# Trading Bot Flow

> **A Sovereign Trading Advisor**: Real-time market intelligence powered by Fractal Mathematics and AI reasoning.

## 🎯 Purpose

This flow transforms raw market data into educational trading insights by combining:

- **Fractal Analysis**: Hurst Exponent for regime detection (Trending vs. Ranging).
- **Technical Indicators**: RSI, MACD, conditioned on market regime.
- **AI Reasoning**: LLM-powered explanations of market conditions.

The goal is not to execute trades automatically, but to act as a **Real-Time Mentor** that teaches you *why* the market behaves as it does.

## ✨ Key Features

1. **📊 Glass Box Analysis**: Transparent view of all metrics (Hurst, RSI, Fractals) and raw LLM input/output.
2. **🧙‍♂️ Cascade Analysis Wizard**: Guided, multi-timeframe analysis (1D → 4H → 1H → 15m) mimicing expert "top-down" analysis.
3. **🤖 Fractal Advisor**: Real-time AI mentor that explains market structure using Hurst Exponent and regime theory.
4. **⚡ Live Ingestion**: WebSocket integration with Binance for real-time OHLCV updates.

## 🏗️ Architecture Overview

```text
N1 (Watcher) → N2 (Scribe) → N3 (Navigator) → N4 (Translator) → N5 (Captain) → N6 (Dashboard)
   Binance       SQLite         Math Engine       Prompt Builder     LLM           Svelte UI
```

See [flow-map.md](./flow-map.md) for detailed node descriptions.

## 🔧 Configuration

### Required Environment Variables

Copy the example file and configure your keys:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes (Phase 3)** | Google AI API key for Gemini Flash 1.5. Get one at [Google AI Studio](https://aistudio.google.com/). |

### `.env.example` Contents

```env
# ===========================================
# TRADING BOT FLOW - Environment Configuration
# ===========================================

# -------------------------------------------
# LLM Provider (Required for Phase 3: Advisor)
# -------------------------------------------
# Google Gemini API Key
# Model used: gemini-1.5-flash (fast, cost-effective)
# Get your key at: https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here

# -------------------------------------------
# Trading Configuration (Optional)
# -------------------------------------------
# Default trading pair to observe
TRADING_SYMBOL=BTCUSDT

# Default candle interval
TRADING_INTERVAL=1m
```

## 📂 Documentation Structure

| Document | Purpose |
| --- | --- |
| [flow_introduction.md](./flow_introduction.md) | Philosophy and high-level concepts. |
| [flow-map.md](./flow-map.md) | Node-by-node breakdown with decisions and stack. |
| [implementation-plan.md](./implementation-plan.md) | Phase-by-phase development plan. |
| [architecture/](./architecture/) | Diagrams (ERD, C4) and tech stack validation. |
| [knowledge/](./knowledge/) | Fractal theory, trading theory, and synthesis docs. |
| [flow-history.md](./flow-history.md) | Chronological development log. |
| [flow-backlog.md](./flow-backlog.md) | Task tracking and phase checklists. |

## 📁 Code Structure

```text
packages/backend/src/
├── api/
│   └── trading.routes.ts           # Trading API endpoints (SSE, start/stop, insights)
├── application/
│   ├── trading/                    # Trading Flow services (with index.ts barrel)
│   │   ├── trading.service.ts      # N1+N2: Data ingestion & persistence
│   │   ├── analyst.service.ts      # N3: Hurst + Fractals (Fractal State Machine)
│   │   ├── synthesizer.service.ts  # N4: LLM prompt builder
│   │   └── mentor.service.ts       # N5: LLM orchestration
│   ├── spotify/                    # Spotify Flow services
│   │   └── spotify.usecase.ts
│   └── stats.service.ts            # Shared flow stats service
├── config/
│   └── trading.config.ts           # Centralized trading configuration
├── domain/
│   └── trading/
│       ├── math/
│       │   ├── hurst.ts            # Hurst exponent calculation
│       │   └── fractals.ts         # Bill Williams fractal detection
│       ├── types/                  # Shared domain types
│       │   ├── market.types.ts
│       │   └── advisor.types.ts
│       └── errors.ts               # Custom error classes
└── infrastructure/
    ├── adapters/
    │   └── binance/
    │       ├── binance-stream.ts   # WebSocket client
    │       └── types.ts
    ├── llm/                        # LLM abstraction layer
    │   ├── llm-client.ts           # Provider factory
    │   └── providers/
    │       ├── base-provider.ts
    │       └── gemini-provider.ts
    └── persistence/
        └── sqlite/
            └── trading-database.ts # SQLite schema & prepared statements

packages/ui/src/lib/
├── components/
│   ├── CandleChart.svelte      # Lightweight Charts wrapper
│   └── StepWizard.svelte       # Multi-timeframe analysis wizard
├── flows/
│   └── trading.ts              # Svelte store & API functions
└── pages/
    └── TradingFlow.svelte      # Dashboard UI
```

## 🧠 LLM Choice

The advisor uses **Google Gemini 2.5 Flash** as the primary LLM:

| Aspect | Choice |
| --- | --- |
| **Model** | `gemini-2.5-flash` (GA) |
| **Why** | Fast inference (~1-2s), low cost, sufficient reasoning for market commentary. |
| **SDK** | `@google/genai` (Official Google SDK for Node.js) |
| **Token Limit** | 1500 max tokens to prevent truncation |
| **Alternative** | Groq (Llama 3) for even faster inference if needed. |

## 🔮 Refactoring Opportunities

### Current Status ✅

- [x] **Service Organization**: Separated by flow (`trading/`, `spotify/`) with barrel exports
- [x] **UI Styling**: Converted to Tailwind CSS
- [x] **Configuration**: Centralized in `config/trading.config.ts`
- [x] **Unit Tests**: Added for math functions (`hurst.ts`, `fractals.ts`)
- [x] **Domain Layer**: extracted types and errors
- [x] **Documentation**: JSDoc added to services
- [x] **Type Safety**: Domain types shared across backend/ui via paths

### Identified Improvements 🚧

1. **Type Safety**: Add Zod schemas for API input/output validation
2. **Monitoring**: Add structured logging and Prometheus metrics
3. **Integration Testing**: More comprehensive end-to-end flow tests

## 🚀 Quick Start

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Configure environment** (required for Phase 3+):

   ```bash
   cp .env.example .env
   # Edit .env with your GEMINI_API_KEY
   ```

3. **Start the backend**:

   ```bash
   pnpm dev
   ```

4. **Start the trading stream** (via API or UI):

   ```bash
   curl -X POST http://localhost:3000/api/trading/start
   ```

5. **View the dashboard**:
   Navigate to `http://localhost:3000/trading` (Phase 4).

## ⚠️ Disclaimer

This tool is for **educational and research purposes only**. It does not execute trades and is not financial advice. All trading decisions are your own responsibility.
