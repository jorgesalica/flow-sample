# @flows/trading

Real-time BTC/USDT analysis through Binance market data, fractal calculations, and
LLM-backed educational insights. This package is an in-process bounded module, not a
separate deployable application.

## Architecture

```text
packages/flows/trading/src/
|-- adapters/binance/       # REST history and WebSocket market-data edge
|-- domain/
|   |-- math/               # Hurst, fractals, and candle patterns
|   |-- advisor-note.ts     # validated LLM response parser
|   `-- errors.ts           # typed application/provider failures
`-- backend/
    |-- config.ts           # constants and runtime environment factory
    |-- database.ts         # SQLite schema and prepared statements
    |-- repository.ts       # row hydration and persisted-insight parsing
    |-- schemas.ts          # TypeBox HTTP contracts
    |-- routes.ts           # composition, validation, HTTP/SSE mapping
    `-- services/
        |-- trading.service.ts    # live stream ingestion
        |-- market.service.ts     # local reads and historical-data port
        |-- analyst.service.ts    # deterministic market analysis
        |-- synthesizer.service.ts # enriched analysis and base prompts
        |-- mentor.service.ts     # persisted on-demand insight
        `-- wizard.service.ts     # cascade prompt and LLM orchestration
```

`createTradingRoutes(config, dependencies)` accepts explicit stream, mentor, market,
and wizard applications. Production composition uses SQLite, Binance, and the shared LLM
factory; route tests inject fakes and call the real Elysia `.handle()` boundary.

## Runtime Configuration

`createTradingConfigFromEnv()` owns environment parsing at composition time. Services do
not read `process.env` directly.

| Variable | Default | Purpose |
| :------- | :------ | :------ |
| `TRADING_SYMBOL` | `BTCUSDT` | Pair used by stream and analysis services |
| `TRADING_INTERVAL` | `1m` | Default stream and local-candle interval |
| `ADVISOR_AUTO_START` | `false` | Enables the mentor during route composition |

## API Routes

| Method | Path | Description |
| :----- | :--- | :---------- |
| GET | `/api/trading/status` | Typed stream and advisor state |
| POST | `/api/trading/start` | Start live ingestion |
| POST | `/api/trading/stop` | Stop live ingestion |
| GET | `/api/trading/candles` | Hydrated local candles |
| GET | `/api/trading/candles/live` | Current in-memory candle snapshot |
| GET | `/api/trading/klines` | Historical Binance klines for a supported interval |
| GET | `/api/trading/fractals` | Hydrated local fractal nodes |
| POST | `/api/trading/advisor/toggle` | Toggle the mentor |
| GET | `/api/trading/advisor/status` | Typed mentor state |
| GET | `/api/trading/insight` | Latest persisted insight or explicit absence |
| POST | `/api/trading/insight/generate` | Generate an on-demand insight |
| POST | `/api/trading/wizard/insight` | Generate one cascade timeframe insight |
| GET | `/api/trading/stream` | Live state/candle SSE stream |

Historical market failures return sanitized `502` responses. Insufficient wizard data
returns `422`; AI provider failures return `502` or `503`; unexpected internal failures
return `500`. Once an SSE stream is open, cancellation or request abort removes both
Trading service listeners.

## UI Data Flow

The SvelteKit loader hydrates status, candles, and the latest insight through a
request-scoped Eden client. Mutations and wizard calls use direct Eden inference from the
TypeBox response contracts. `EventSource` is reserved for live state and candle events;
the UI validates parsed payloads before updating its runes store.

## Verification

```bash
pnpm --filter @flows/trading typecheck
pnpm --filter @flows/trading test
pnpm --filter @flows/trading test:coverage
pnpm --filter @flows/ui test src/lib/flows/trading src/routes/trading/page.test.ts
```
