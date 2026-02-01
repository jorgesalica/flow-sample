# Implementation Plan: Trading Bot Flow

> **Status**: Planning Phase
> **Branch**: `9th-flow-trading-bot`
> **Goal**: Incrementally build the Sovereign Trading Advisor from data ingestion to intelligent dashboard.

## 📐 Codebase Context

The project follows a monorepo structure with clean architecture:

```
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
    ├── pages/
    ├── components/
    └── stores.ts      # Svelte stores
```

**Integration Points**:

* New database: `data/trading.db` (separate from existing `data/flow.db`).
* New adapter folder: `infrastructure/adapters/binance/`.
* New domain: `domain/trading/`.
* New routes: `api/trading.routes.ts`.
* New UI flow: `ui/src/lib/flows/trading.ts`.

---

## 🚀 Phase 1: The Foundation (N1 + N2)

> **Goal**: Establish real-time data pipeline from Binance to local SQLite.

### 1.1 Database Schema (`trading.db`)

| Task | Details |
|---|---|
| **File** | `packages/backend/src/infrastructure/persistence/sqlite/trading-database.ts` |
| **Action** | Create new file. Initialize `better-sqlite3` connection to `data/trading.db`. |
| **Schema** | Create tables: `candles`, `fractal_nodes`, `advisor_logs` (as per ERD in `architecture-diagrams.md`). |
| **Pragma** | Enable `journal_mode = WAL`. |
| **Export** | Export `tradingDb` instance and prepared statements (`upsertCandle`, `getLastNCandles`). |

```typescript
// Pseudo-structure
export const tradingDb = new Database('data/trading.db');
tradingDb.pragma('journal_mode = WAL');

// Schema
tradingDb.exec(`
  CREATE TABLE IF NOT EXISTS candles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    interval TEXT NOT NULL,
    open_time INTEGER NOT NULL,
    open REAL, high REAL, low REAL, close REAL, volume REAL,
    close_time INTEGER,
    UNIQUE(symbol, interval, open_time)
  );
  CREATE INDEX IF NOT EXISTS idx_candles_time ON candles(symbol, interval, open_time DESC);
`);

export const upsertCandle = tradingDb.prepare(`...ON CONFLICT DO UPDATE...`);
export const getLastNCandles = tradingDb.prepare(`SELECT * FROM candles WHERE symbol = ? ORDER BY open_time DESC LIMIT ?`);
```

### 1.2 Binance WebSocket Adapter (N1)

| Task | Details |
|---|---|
| **Folder** | `packages/backend/src/infrastructure/adapters/binance/` |
| **Files** | `index.ts`, `binance-stream.ts`, `types.ts` |
| **Action** | Implement WebSocket client using `ws` package. |
| **Logic** |
| | - Connect to `wss://stream.binance.com:9443/ws/<symbol>@kline_<interval>`. |
| | - Handle `ping`/`pong` heartbeat. |
| | - Parse `kline` messages, emit `CANDLE_UPDATE` and `CANDLE_CLOSED` events. |
| | - Implement exponential backoff reconnection. |
| **Export** | `BinanceStream` class with `connect()`, `disconnect()`, `on('candle', callback)`. |

```typescript
// binance-stream.ts (Pseudo)
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class BinanceStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private symbol: string;
  private interval: string;

  constructor(symbol: string, interval: string = '1m') { ... }

  connect(): void {
    const url = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`;
    this.ws = new WebSocket(url);
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('ping', () => this.ws?.pong());
    this.ws.on('close', () => this.scheduleReconnect());
  }

  private handleMessage(data: WebSocket.Data): void {
    const msg = JSON.parse(data.toString());
    if (msg.e === 'kline') {
      const kline = msg.k;
      this.emit('candle', {
        symbol: kline.s, openTime: kline.t, closeTime: kline.T,
        open: parseFloat(kline.o), high: parseFloat(kline.h),
        low: parseFloat(kline.l), close: parseFloat(kline.c),
        volume: parseFloat(kline.v), isClosed: kline.x
      });
    }
  }
}
```

### 1.3 Trading Service (Orchestrator)

| Task | Details |
|---|---|
| **File** | `packages/backend/src/application/trading.service.ts` |
| **Action** | Create service that orchestrates N1 -> N2 flow. |
| **Logic** |
| | - On startup, instantiate `BinanceStream`. |
| | - Listen to `candle` events. |
| | - If `isClosed === true`, call `upsertCandle` to persist. |
| **Dependencies** | `BinanceStream`, `tradingDb`. |

### 1.4 API Routes

| Task | Details |
|---|---|
| **File** | `packages/backend/src/api/trading.routes.ts` |
| **Routes** |
| | `GET /api/trading/status` - Returns connection status. |
| | `GET /api/trading/candles?symbol=BTCUSDT&limit=100` - Returns recent candles. |
| | `POST /api/trading/start` - Starts the WebSocket stream. |
| | `POST /api/trading/stop` - Stops the stream. |
| **Integration** | Add `.use(createTradingRoutes())` to `app.ts`. |

### 1.5 Dependencies

```bash
cd packages/backend
pnpm add ws better-sqlite3
pnpm add -D @types/ws
```

Note: `better-sqlite3` might already be installed (it is, used for `flow.db`).

### 1.6 Verification (Phase 1)

| Test | Command / Action |
|---|---|
| **Unit** | Create `trading-database.test.ts`. Test `upsertCandle` idempotency. |
| **Manual** | Call `POST /api/trading/start`. Observe logs for `CANDLE_CLOSED` events. Check `trading.db` for rows. |
| **Teardown** | Call `POST /api/trading/stop`. Verify WebSocket closes cleanly. |

---

## 🧠 Phase 2: The Navigator (N3)

> **Goal**: Implement the Fractal State Machine (Hurst, Fractals, Conditional Indicators).

### 2.1 Math Utilities

| Task | Details |
|---|---|
| **Folder** | `packages/backend/src/domain/trading/math/` |
| **Files** | `hurst.ts`, `fractals.ts` |
| **`hurst.ts`** | Implement R/S (Rescaled Range) algorithm. Input: `number[]` (closes). Output: `number` (H). |
| **`fractals.ts`** | Implement Bill Williams 5-bar fractal detection. Input: `Candle[]`. Output: `FractalNode[]`. |

```typescript
// hurst.ts (Pseudo)
export function calculateHurst(closes: number[], minWindowSize = 10, maxWindowSize?: number): number {
  // 1. Calculate log returns
  // 2. Loop over window sizes (n)
  // 3. For each n: calculate R/S
  // 4. Perform linear regression on log(n) vs log(R/S)
  // 5. Return slope (H)
}
```

### 2.2 Analyst Service (N3)

| Task | Details |
|---|---|
| **File** | `packages/backend/src/application/analyst.service.ts` |
| **Action** | Create the core "State Machine". |
| **Input** | Triggered by `TradingService` after a candle closes. |
| **Logic** |
| | 1. Fetch last 500 candles from `tradingDb`. |
| | 2. Call `calculateHurst(closes)`. |
| | 3. Determine `Regime` based on H value. |
| | 4. Call `detectFractals(candles)` to find active nodes. |
| | 5. If `Regime == TRENDING`: Calculate MACD. If `Regime == RANGING`: Calculate RSI. |
| | 6. Construct `MarketState` object. |
| **Output** | `MarketState { regime, hurst, dimension, nodes, indicators }`. |
| **Dependencies** | `tradingDb`, `technicalindicators`, custom math. |

### 2.3 Dependencies

```bash
cd packages/backend
pnpm add technicalindicators
```

### 2.4 Verification (Phase 2)

| Test | Command / Action |
|---|---|
| **Unit** | `hurst.test.ts`: Test against known series (e.g., synthetic trending/random data). |
| **Unit** | `fractals.test.ts`: Test with sample OHLC data containing known fractal points. |
| **Integration** | Let stream run for 5+ minutes. Observe `MarketState` logs after each candle close. |

---

## 🗣️ Phase 3: The Advisor (N4 + N5)

> **Goal**: Synthesize context and generate LLM-powered educational insights.

> **Architecture Note**: We use an **abstracted LLM layer** (`infrastructure/llm/`) instead of coupling directly to Gemini. This allows easy provider swaps (Gemini ↔ Groq ↔ OpenAI) and reuse across other flows (Spotify, Lyrics).

### 3.1 LLM Layer (Generic, Flow-Agnostic)

| Task | Details |
|---|---|
| **Directory** | `packages/backend/src/infrastructure/llm/` |
| **Files** | |
| | `providers/base-provider.ts` - Abstract interface for all LLM providers |
| | `providers/gemini-provider.ts` - Gemini 3 Flash implementation |
| | `providers/groq-provider.ts` - Groq Llama implementation (optional) |
| | `llm-client.ts` - Factory pattern for provider selection |
| | `types.ts` - Generic `LLMRequest`, `LLMResponse`, `LLMMessage` |
| **Action** | Create provider-agnostic abstraction using `@google/genai` SDK initially. |
| **Config** | `LLM_PROVIDER` (gemini/groq), `GEMINI_API_KEY`, `GROQ_API_KEY` in `.env`. |
| **Export** | `LLMClient` class with `.generate(request: LLMRequest): Promise<LLMResponse>` method. |

**Reference**: See `llm-abstraction-plan.md` for full architecture details.

### 3.2 Synthesizer Service (N4)

| Task | Details |
|---|---|
| **File** | `packages/backend/src/application/trading/synthesizer.service.ts` |
| **Action** | Transform `MarketState` into a structured JSON prompt for the LLM. |
| **Input** | `MarketState` from `AnalystService`. |
| **Output** | `LLMMessage[]` array with system prompt + user content (market state JSON). |
| **Logic** | |
| | 1. Construct system prompt based on `agents/N5-The-Mentor.md` spec. |
| | 2. Serialize `MarketState` to JSON. |
| | 3. Return `[{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify(state) }]`. |

### 3.3 Mentor Service (N5)

| Task | Details |
|---|---|
| **File** | `packages/backend/src/application/trading/mentor.service.ts` |
| **Action** | Orchestrate N4 → LLM → Response parsing. |
| **Input** | `MarketState`. |
| **Logic** | |
| | 1. Call `SynthesizerService.buildMessages(state)` to get `LLMMessage[]`. |
| | 2. Instantiate `LLMClient` (reads `LLM_PROVIDER` from env). |
| | 3. Call `llmClient.generate({ messages, temperature: 0.5, maxTokens: 600 })`. |
| | 4. Parse JSON response (`AdvisorNote`). |
| **Output** | `AdvisorNote { title, regime_context, scenario_bullish, scenario_bearish, mentor_tip }`. |
| **Persistence** | Store `AdvisorNote` in `advisor_logs` table with `timestamp`, `regime`, `insight_json`. |

### 3.4 Dependencies

```bash
cd packages/backend
pnpm add @google/genai  # For Gemini provider
# pnpm add groq-sdk      # Optional, for Groq provider
```

### 3.5 API Routes (Extend)

> **Note**: The advisor is **on-demand** (user-controlled toggle) to minimize LLM costs.

| Route | Details |
|---|---|
| `POST /api/trading/advisor/toggle` | Enable/disable advisor. Body: `{ enabled: boolean }`. Returns: `{ active: boolean }`. |
| `GET /api/trading/advisor/status` | Returns current advisor state: `{ active: boolean, uptime_minutes: number }`. |
| `GET /api/trading/insight` | Returns the latest `AdvisorNote` from `advisor_logs`. |
| `POST /api/trading/insight/generate` | **On-demand**: Generates a single insight right now (regardless of toggle state). |
| `GET /api/trading/state` | Returns current `MarketState` from `AnalystService`. |

**Implementation Details**:
* Add `advisorEnabled: boolean` state to `MentorService` (default: `false`).
* On candle close: Check `if (advisorEnabled) { generateInsight() }`.
* `/toggle` endpoint updates `advisorEnabled` and persists to config.
* `/generate` endpoint bypasses toggle for manual one-off insights.

### 3.6 Environment Variables (Update)

Add to `.env`:

```env
# Advisor defaults to OFF to save costs
ADVISOR_AUTO_START=false

# Optional: Auto-enable during specific hours (e.g., "09:00-17:00")
# ADVISOR_ACTIVE_HOURS=09:00-17:00
# ADVISOR_TIMEZONE=America/New_York
```

### 3.7 Verification (Phase 3)

| Test | Command / Action |
|---|---|
| **Unit** | Create `llm-client.test.ts`. Mock `BaseLLMProvider`. Verify factory pattern. |
| **Integration** | Test `MentorService` with real Gemini API key (use test budget). |
| **Manual** | Trigger `/api/trading/insight`. Verify response matches JSON schema from `N5-The-Mentor.md`. |
| **Database** | Query `advisor_logs` table. Verify `insight_json` column contains valid JSON. |

---

## 📺 Phase 4: The Dashboard (N6)

> **Goal**: Visualize the flow in the Svelte UI.

### 4.1 UI Store

| Task | Details |
|---|---|
| **File** | `packages/ui/src/lib/flows/trading.ts` |
| **Action** | Create Svelte store for trading state. |
| **State** | `{ isConnected: boolean, candles: Candle[], state: MarketState | null, insight: AdvisorNote | null }`. |
| **Actions** | `start()`, `stop()`, `fetchState()`, `fetchInsight()`. |

### 4.2 Trading Page

| Task | Details |
|---|---|
| **File** | `packages/ui/src/lib/pages/TradingPage.svelte` |
| **Action** | Create main dashboard view. |
| **Layout** |
| | - Header: Connection Status, Start/Stop buttons. |
| | - Left Panel: Candlestick Chart (Chart.js or lightweight-charts). |
| | - Right Panel: Regime Widget ("Weather"), Latest Insight (Markdown render). |
| | - Bottom: Table of recent `FractalNode` levels. |

### 4.3 Components

| Component | Details |
|---|---|
| `RegimeWidget.svelte` | Displays current Hurst regime (Trending/Ranging/Noise) with icon/color. |
| `InsightCard.svelte` | Renders the `AdvisorNote.insight` as Markdown. |
| `FractalNodeList.svelte` | Table showing active price levels (Support/Resistance). |

### 4.4 Router Integration

| Task | Details |
|---|---|
| **File** | `packages/ui/src/App.svelte` |
| **Action** | Add route `/trading` pointing to `TradingPage.svelte`. |

### 4.5 Verification (Phase 4)

| Test | Command / Action |
|---|---|
| **Manual** | Navigate to `/trading`. Click "Start". Verify chart updates. |
| **Visual** | Confirm Regime widget changes color based on state. |
| **E2E (Future)** | Playwright test: Start stream -> Wait 2 mins -> Assert candle count > 0. |

---

## 📅 Phase Summary

| Phase | Nodes | Deliverable |
|---|---|---|
| **Phase 1** | N1, N2 | Live data pipeline (`trading.db` populated) |
| **Phase 2** | N3 | Fractal State Machine (Hurst, Fractals, Indicators) |
| **Phase 3** | N4, N5 | LLM Integration (Insights generated) |
| **Phase 4** | N6 | Dashboard UI (Visual feedback) |
