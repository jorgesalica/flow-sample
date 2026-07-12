# @flows/trading

Trading bot flow — real-time BTC/USDT analysis using Binance WebSocket, fractal analysis, and AI-driven insights.

## Architecture

```text
packages/flows/trading/src/
├── adapters/binance/       # REST history + WebSocket market-data edge
├── domain/math/            # Hurst, fractals, candle patterns
├── domain/types/           # market and advisor domain types
└── backend/
    ├── config.ts           # static thresholds + runtime env factory
    ├── database.ts         # SQLite schema and prepared statements
    ├── routes.ts           # Elysia HTTP/SSE composition
    └── services/           # analyst, synthesizer, mentor, stream orchestration

packages/ui/src/lib/flows/trading/
├── api.ts                  # Eden calls and SSE adapter
├── stores.svelte.ts        # client runtime state
├── wizard.ts               # timeframe definitions and pure presentation calculations
├── TradingFlow.svelte      # dashboard/wizard composition
└── components/             # StepWizard and CandleChart
```

## Key Features

- Real-time 1-minute candle streaming from Binance
- Fractal pattern detection with multi-timeframe analysis
- Hurst exponent calculation for regime classification
- AI-powered market insights via OpenRouter (Cascade Wizard)
- Server-Sent Events (SSE) for live UI updates
- Start/stop stream controls and advisor toggle

## Runtime Configuration

`createTradingConfigFromEnv()` owns environment parsing at composition time. The route
factory receives the resulting `{ symbol, interval, advisorAutoStart }` object, and
services do not read `process.env` directly.

| Variable | Default | Purpose |
| :------- | :------ | :------ |
| `TRADING_SYMBOL` | `BTCUSDT` | Binance pair used by the stream and analysis services |
| `TRADING_INTERVAL` | `1m` | Default candle interval |
| `ADVISOR_AUTO_START` | `false` | Enables the mentor service during route composition when set to `true` |

## API Routes

| Method | Path | Description |
| :----- | :--- | :---------- |
| GET | `/api/trading/status` | Current trading state |
| POST | `/api/trading/start` | Start candle stream |
| POST | `/api/trading/stop` | Stop candle stream |
| GET | `/api/trading/candles` | Historical candles |
| GET | `/api/trading/candles/live` | Current in-memory candle snapshot |
| GET | `/api/trading/klines` | Klines for wizard |
| GET | `/api/trading/fractals` | Detected fractals |
| POST | `/api/trading/advisor/toggle` | Toggle AI advisor |
| GET | `/api/trading/advisor/status` | Current advisor state |
| GET | `/api/trading/insight` | Latest persisted insight |
| POST | `/api/trading/insight/generate` | Generate insight |
| POST | `/api/trading/wizard/insight` | Generate one cascade timeframe insight |
| GET | `/api/trading/stream` | SSE live stream |

## UI Data Flow

The route loader hydrates the initial status, candle window, and latest insight. Runtime
updates then arrive through the SSE adapter into `stores.svelte.ts`. The Cascade Wizard
requests historical windows through Eden; `wizard.ts` owns timeframe definitions and
pure display calculations, while `StepWizard.svelte` owns interaction and rendering.
