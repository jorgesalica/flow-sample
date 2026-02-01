# Flow History: Trading Bot

## 📅 Chronological Log

### 1. Initialization

* **Action**: Created branch `9th-flow-trading-bot`.
* **Documentation**: Initialized `docs/flows/trading-bot/flow_introduction.md` with a high-level philosophical placeholder ("The Advisor").

### 2. Analysis & Critique

* **Discussion**: Reviewed the initial "fetch every 1s" approach.
* **Decision**:
  * Shifted to **WebSockets** for real-time ingestion instead of polling.
  * Proposed a **Tiered LLM Strategy** (Tier 1: Code, Tier 2: Flash, Tier 3: GPT-4).
  * **DB Separation**: Decided to use `trading.db` (SQLite) separate from the main `flow.db`.

### 3. Technical Definition

* **Artifact**: Created `technical-feasibility.md`.
* **Details**: Defined the stack (Node.js/TS, `technicalindicators` lib, standard SQLite).
* **Diagram**: Added architectural Mermaid diagrams.

### 4. Knowledge Structuring

* **Deep Research**: Processed detailed papers on **Fractal Theory** (Mandelbrot) and **Standard Trading Theory**.
* **Artifacts**:
  * `knowledge/fractal-theory.md`: Synthesis of Hurst, Fractal Dimension, and Power Laws.
  * `knowledge/trading-theory.md`: Synthesis of Market Structure, RSI Divergence, and Risk Mechanics (1% Rule, ATR).
  * `knowledge/combined-synthesis.md`: The Unified decision strategy.
  * `knowledge/quick-overview*.md`: Simplified guides for high-level understanding.
* **Philosophy**: Integrated "Fractal Market Hypothesis" as the core logic engine.

### 5. Flow Mapping

* **Artifact**: Created `flow-map.md`.
* **Refinement**:
  * Mapped sequential nodes (N1 to N6).
  * Adopted dual naming convention (The Observer, The Analyst, etc.).
  * Updated N3 (Analyst) to act as a **Fractal State Machine**.
  * **Metaphor**: Solidified the "Ship Crew" analogy (Watcher, Scribe, Navigator, Captain).
  * **Tech Narrative**: Detailed the event loop execution flow.

### 6. Architecture & Organization

* **Action**: Restructured documentation directory.
* **Artifact**: Created `architecture/architecture-diagrams.md`.
* **Details**:
  * Added **ERD** for `trading.db`.
  * Added **C4 Context & Container** diagrams.
  * Added **Sequence Diagram** for the candle lifecycle.
* **Move**: Relocated `architecture.md` to `architecture/` folder.

### 7. Tech Stack Validation

* **Action**: Created `architecture/tech-docs.md`.
* **Research**: Validated each technology against official documentation:
  * Binance WebSocket API (Streams, Ping/Pong, Kline Payload).
  * `ws` npm package (WebSocket client).
  * `better-sqlite3` (Synchronous SQLite driver).
  * `technicalindicators` (RSI, MACD library).
  * Custom Hurst Exponent implementation (No npm lib found).
  * Google Gemini API (`@google/genai` SDK).

### 8. Implementation Planning

* **Action**: Created `implementation-plan.md`.
* **Details**:
  * Analyzed existing codebase structure (`packages/backend/src`, UI flows, etc.).
  * Defined 4 iterative phases:
    * **Phase 1**: Foundation (N1 Watcher + N2 Scribe) - DB schema, WebSocket adapter.
    * **Phase 2**: Navigator (N3) - Hurst, Fractals, Indicators.
    * **Phase 3**: Advisor (N4 + N5) - LLM integration.
    * **Phase 4**: Dashboard (N6) - Svelte UI.
  * Specified file paths, functions, and dependencies per phase.

### 9. Final Documentation Polish

* **Action**: Created `README.md` for the Trading Bot Flow.
* **Created**: `packages/backend/.env.example` with `GEMINI_API_KEY` placeholder.
* **LLM Decision**: Confirmed **Gemini 1.5 Flash** as the primary advisor model (fast, low-cost).
* **Cleanup**: Removed time estimates and "Next Action" from implementation plan.

### 10. Agent Documentation

* **Action**: Restored `.env.example` to preserve original Spotify configs.
* **Artifact**: Created `agents/N5-The-Mentor.md`.
* **Details**: Documented the "Mentor" agent profile, including Model ID (Gemini 1.5 Flash), rationale for choice (Latency/Cost), and cognitive function.
