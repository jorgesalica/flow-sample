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

- [ ] **Phase 1: The Foundation (N1 + N2)**:
  - [ ] Create `trading-database.ts` (schema, prepared statements).
  - [ ] Create `adapters/binance/` (WebSocket client).
  - [ ] Create `trading.service.ts` (orchestrator).
  - [ ] Create `trading.routes.ts` (API endpoints).
  - [ ] Install `ws` dependency.
  - [ ] Verify live data ingestion.
- [ ] **Phase 2: The Navigator (N3)**:
  - [ ] Implement `hurst.ts` (R/S algorithm).
  - [ ] Implement `fractals.ts` (5-bar detection).
  - [ ] Create `analyst.service.ts` (Fractal State Machine).
- [ ] **Phase 3: The Advisor (N4 + N5)**:
  - [ ] Create `gemini.adapter.ts` (LLM client).
  - [ ] Create `synthesizer.service.ts` (prompt builder).
  - [ ] Create `mentor.service.ts` (orchestrator).
- [ ] **Phase 4: The Dashboard (N6)**:
  - [ ] Create `flows/trading.ts` (Svelte store).
  - [ ] Create `TradingPage.svelte` (main view).
  - [ ] Create Regime/Insight components.
