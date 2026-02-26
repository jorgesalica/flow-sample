# @flows/trading

Trading bot flow — real-time BTC/USDT analysis using Binance WebSocket, fractal analysis, and AI-driven insights.

## Architecture

```text
adapter/    → Binance WebSocket client, candle aggregation
analysis/   → Hurst exponent, fractal detection, ATR calculation
advisor/    → AI insight generation (OpenRouter LLM integration)
routes      → Elysia API routes + SSE streaming (/api/trading/*)
```

## Key Features

- Real-time 1-minute candle streaming from Binance
- Fractal pattern detection with multi-timeframe analysis
- Hurst exponent calculation for regime classification
- AI-powered market insights via OpenRouter (Cascade Wizard)
- Server-Sent Events (SSE) for live UI updates
- Start/stop stream controls and advisor toggle

## API Routes

| Method | Path | Description |
| :----- | :--- | :---------- |
| GET | `/api/trading/status` | Current trading state |
| POST | `/api/trading/start` | Start candle stream |
| POST | `/api/trading/stop` | Stop candle stream |
| GET | `/api/trading/candles` | Historical candles |
| GET | `/api/trading/klines` | Klines for wizard |
| GET | `/api/trading/fractals` | Detected fractals |
| POST | `/api/trading/advisor/toggle` | Toggle AI advisor |
| POST | `/api/trading/insight/generate` | Generate insight |
| GET | `/api/trading/stream` | SSE live stream |
