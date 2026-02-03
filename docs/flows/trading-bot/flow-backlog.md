# Flow Backlog: Trading Bot

## ✅ Completed

- [x] **Initialization**: Create branch and basic intro doc.
- [x] **Feasibility**: Define stack, architecture, and costs (`technical-feasibility.md`).
- [x] **Structure**: Create `knowledge/` folder and research prompts.
- [x] **Mapping**: Create and refine `flow-map.md` with decisions and dual naming.
- [x] **History**: Create `flow-history.md` for audit trail.

## 🚧 In Progress / Next Steps

- [x] **Data Ingestion (Deep Research)**:
  - [x] Receive "Standard Trading Theory" research results.
  - [x] Receive "Fractal Theory" research results.
- [x] **Knowledge Synthesis**:
  - [x] Update `knowledge/trading-theory.md` with results.
  - [x] Update `knowledge/fractal-theory.md` with results.
  - [x] Create `knowledge/combined-synthesis.md` (Visual & Narrative integration).
  - [x] Create `quick-overview` syntheses.
- [x] **Flow Refinement**:
  - [x] Polish `flow-map.md` based on synthesized knowledge (Refine N3 & N5).
  - [x] Create `architecture/architecture-diagrams.md` (ERD, C4).
  - [x] Finalize Node inputs/outputs and Stack decisions.
- [x] **Tech Stack Validation**:
  - [x] Create `architecture/tech-docs.md` with research for each library/service.
- [x] **Implementation Planning**:
  - [x] Analyze codebase structure for integration points.
  - [x] Create `implementation-plan.md` with 4 iterative phases.
- [x] **Final Documentation**:
  - [x] Create `README.md` for the Trading Bot Flow.
  - [x] Restore and update `packages/backend/.env.example`.
  - [x] Confirm LLM choice: **Gemini 1.5 Flash**.
  - [x] Create `agents/N5-The-Mentor.md` profile.

## 🔜 Implementation Phases

- [x] **Phase 1: The Foundation (N1 + N2)**:
  - [x] Create `trading-database.ts` (schema, prepared statements).
  - [x] Create `adapters/binance/` (WebSocket client).
  - [x] Create `trading.service.ts` (orchestrator).
  - [x] Create `trading.routes.ts` (API endpoints).
  - [x] Install `ws` dependency.
  - [x] Verify live data ingestion.
- [x] **Phase 2: The Navigator (N3)**:
  - [x] Implement `hurst.ts` (R/S algorithm).
  - [x] Implement `fractals.ts` (5-bar detection).
  - [x] Create `analyst.service.ts` (Fractal State Machine).
- [x] **Phase 3: The Advisor (N4 + N5)**:
  - [x] Create LLM abstraction layer with Gemini provider.
  - [x] Create `synthesizer.service.ts` (prompt builder).
  - [x] Create `mentor.service.ts` (orchestrator).
  - [x] Install `@google/genai` SDK.
  - [x] Configure gemini-2.5-flash model.
- [x] **Phase 4: The Dashboard (N6)**:
  - [x] Create `flows/trading.ts` (Svelte store).
  - [x] Create `TradingFlow.svelte` (main view).
  - [x] Add SSE for real-time updates.
  - [x] Integrate into app routing.

## 🚀 Future Enhancements

## 🚀 Future Enhancements

### High Priority 🔥 (Iteration 3: The Cascade Agent)

- [ ] **Candle Pattern Detection**: Implement algorithm to detect visual patterns (Hammer, Engulfing, Doji) for entry triggers.
- [ ] **Cascade Analysis Logic**: Refactor MentorService to process data in stages: Macro (1D/4H) -> Structure (1H) -> Entry (15m).
- [ ] **Risk Management Engine**: Calculate and suggest structural Stop Loss and R:R Ratio in the insight.
- [ ] **Data Confluence**: Calculate "Touch Count" for S/R levels to validate strength.

### Medium Priority ⭐

- [ ] **Chat Interface**: Convert insight panel to interactive chat for follow-up questions
- [ ] **Automatic Advisor Mode**: Implement scheduled insight generation when advisor is ON
- [ ] **Historical Data Backfill**: Add ability to fetch and analyze historical candles
- [ ] **Multi-Symbol Support**: Track multiple trading pairs simultaneously
- [ ] **Charting**: Add visual candle charts with fractal overlays
- [ ] **Notification System**: Alert users on regime changes or significant patterns

### Low Priority 📋

- [x] **Export/Import**: Save and restore analysis sessions
- [x] **Testing**: Add unit tests for math functions and integration tests for services
- [x] **Refactoring**: Extract business logic to domain layer, add error handling, improve type safety

---

## ✅ Completed (Iteration 1 & 2)

- [x] **Insight Data Transparency**: "Glass Box" UI showing raw inputs.
- [x] **Improve LLM Prompt**: "Quantitative Analyst" persona with specific data citation.
- [x] **Advanced Indicators**: Added RSI/MACD dynamic calculation based on regime.

---

## ✅ Completed Refactoring (Section 12)

- [x] **Service Organization**: Moved to flow-specific folders (trading/, spotify/)
- [x] **Barrel Exports**: Added index.ts for cleaner imports
- [x] **Type Extraction**: Created domain/trading/types/ with shared types
- [x] **Config Centralization**: Created config/trading.config.ts
- [x] **UI Tailwind**: Converted TradingFlow.svelte to Tailwind CSS
- [x] **Path Aliases**: Added @config/* to backend and UI tsconfig
