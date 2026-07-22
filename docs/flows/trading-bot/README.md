# Trading Flow

Trading is an educational market-analysis workspace. It ingests Binance candles,
calculates deterministic fractal and regime signals, and can ask the shared LLM layer to
explain those signals. It does not place orders, manage exchange credentials, or provide
financial advice.

## Current Capabilities

- Live Binance OHLCV ingestion with explicit start/stop state.
- Local candle and fractal persistence in `trading.db`.
- Hurst, Bill Williams fractal, candlestick-pattern, and risk-context analysis.
- On-demand advisor notes with provider/model audit metadata.
- A top-down wizard for `1d`, `4h`, `1h`, and `15m` analysis.
- Typed HTTP contracts plus validated live SSE events.
- A responsive SvelteKit workspace with charts and explicit provider/error states.

The flow is a bounded package mounted by the shared Elysia host, not a standalone service.
Its detailed source layout and endpoint list live in the
[`@flows/trading` package README](../../../packages/flows/trading/README.md).

## Runtime Configuration

Binance public market data needs no API key. AI features use the provider-neutral
`@flows/core` LLM client and require at least one configured provider key.

| Variable             | Default          | Purpose                                     |
| -------------------- | ---------------- | ------------------------------------------- |
| `TRADING_SYMBOL`     | `BTCUSDT`        | Default market pair                         |
| `TRADING_INTERVAL`   | `1m`             | Default live candle interval                |
| `ADVISOR_AUTO_START` | `false`          | Enable the advisor when routes are composed |
| `LLM_PROVIDER`       | `gemini`         | Direct provider or `rotation`               |
| `LLM_MODEL`          | provider default | Optional direct-provider model override     |

Provider keys and rotation behavior are documented in [LLM API keys](../llm/api-keys.md).
Services receive configuration at composition time and do not read environment variables
directly.

## Failure And Safety Contract

- Historical Binance failures return a sanitized `502`.
- Insufficient wizard data returns `422`.
- AI provider unavailability returns `502` or `503` without exposing provider bodies.
- Closing an SSE request removes Trading listeners.
- Generated notes are explanatory context only; users retain responsibility for every
  financial decision.

## Development

```bash
pnpm dev
pnpm --filter @flows/trading typecheck
pnpm --filter @flows/trading test
pnpm --filter @flows/trading test:coverage
pnpm --filter @flows/ui test src/lib/flows/trading src/routes/trading/page.test.ts
```

## Supporting Material

The following documents preserve product reasoning and completed implementation history.
They are not active backlogs; executable work belongs in GitHub issues and the
[repository roadmap](../../ROADMAP.md).

- [Flow introduction](flow_introduction.md)
- [Conceptual node map](flow-map.md)
- [Completed implementation iterations](implementation-plan.md)
- [Historical change log](flow-history.md)
- [Architecture research](architecture/)
- [Trading and fractal research](knowledge/)
