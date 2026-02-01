# Trading Bot Flow

> **A Sovereign Trading Advisor**: Real-time market intelligence powered by Fractal Mathematics and AI reasoning.

## 🎯 Purpose

This flow transforms raw market data into educational trading insights by combining:

- **Fractal Analysis**: Hurst Exponent for regime detection (Trending vs. Ranging).
- **Technical Indicators**: RSI, MACD, conditioned on market regime.
- **AI Reasoning**: LLM-powered explanations of market conditions.

The goal is not to execute trades automatically, but to act as a **Real-Time Mentor** that teaches you *why* the market behaves as it does.

## 🏗️ Architecture Overview

```
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
|---|---|---|
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
|---|---|
| [flow_introduction.md](./flow_introduction.md) | Philosophy and high-level concepts. |
| [flow-map.md](./flow-map.md) | Node-by-node breakdown with decisions and stack. |
| [implementation-plan.md](./implementation-plan.md) | Phase-by-phase development plan. |
| [architecture/](./architecture/) | Diagrams (ERD, C4) and tech stack validation. |
| [knowledge/](./knowledge/) | Fractal theory, trading theory, and synthesis docs. |
| [flow-history.md](./flow-history.md) | Chronological development log. |
| [flow-backlog.md](./flow-backlog.md) | Task tracking and phase checklists. |

## 🧠 LLM Choice

The advisor uses **Google Gemini 1.5 Flash** as the primary LLM:

| Aspect | Choice |
|---|---|
| **Model** | `gemini-1.5-flash` |
| **Why** | Fast inference (~1-2s), low cost, sufficient reasoning for market commentary. |
| **SDK** | `@google/genai` (Official Google SDK for Node.js) |
| **Alternative** | Groq (Llama 3) for even faster inference if needed. |

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
