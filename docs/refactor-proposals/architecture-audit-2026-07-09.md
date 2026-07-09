# Architecture Audit - 2026-07-09

Scope: refactor/quality pass for `flow-sample`, excluding the product epics #27
(Spotify x Lyrics x Canvas) and #23 (LLM depth / multi-agent).

Reference baseline: `ccec` local repo, especially its backend flow layering,
Eden data-access pattern, UI/a11y primitives, and testing docs. This repo should
stay lighter than `ccec`, but the same boundaries apply: thin routes, explicit
composition roots, typed RPC, server data through loaders, and tests that cover
behavior rather than implementation.

## Done in this pass

- Updated local `main` to `origin/main` and confirmed a clean working tree before
  edits.
- Removed production-host hardcoding from the UI Eden client. The default base is
  now same-origin; `VITE_API_URL` remains available for an explicit override.
- Changed Canvas REST calls from `http://localhost:4173/api/canvas` to
  `/api/canvas`.
- Updated roadmap/backend/agent docs that still described completed migration
  work as pending.
- Removed one production `any` from the trading synthesizer return type.
- Re-enabled `@typescript-eslint/no-explicit-any` for backend-managed TS lint and
  expanded that lint surface to backend, core, shared, and all flow packages.
- Split backend app construction (`createApp(config)`) from process startup
  (`server.ts`) and added a health-route test that imports the app without
  binding a port.
- Moved Lyrics Canvas track/lyrics SQL into a repository, moved analysis
  orchestration into a service, and left routes as HTTP mapping only.
- Added focused tests for the Lyrics Canvas repository/service and tightened
  LLM core test helpers so they no longer rely on explicit `any`.
- Fixed backend static UI serving to point at SvelteKit's `packages/ui/build`
  output.
- Added `typecheck` to `@flows/shared` so root typecheck covers shared types.

## High-priority refactor queue

### 1. Enforce the conventions with tooling

Status: done for TypeScript packages covered by backend lint. Remaining work is
to extract this into a shared root ESLint config if the repo grows beyond this
personal-workspace shape.

### 2. Split backend app construction from process startup

Status: done for the backend host. `app.ts` now exports `createApp(config)` and
`server.ts` owns `.listen(...)`. Keep new route tests on `app.handle(...)` so
importing backend types remains side-effect free.

### 3. Move lyrics canvas SQL out of routes

Status: done. The route now composes `SQLiteLyricsCanvasRepository` and
`LyricsCanvasService`; SQL and orchestration have focused unit coverage.

### 4. Normalize env/config ownership

Current gap: some package-level modules still read `process.env` directly:

- `@flows/core/llm` reads provider/model env.
- Trading config/service reads `TRADING_*` and `ADVISOR_AUTO_START`.
- Backend env reads now live in `config.ts` / `server.ts`, while `app.ts`
  remains import-safe.

This is workable for a personal project, but it weakens testability and makes
runtime behavior implicit.

Next step:

- Keep env reads in package factories only when they are explicitly named as
  composition helpers (`createLLMClientFromEnv`).
- Prefer passing config into services/routes from the backend host.
- Rename factories so env-reading behavior is visible.

### 5. Finish UI data-access alignment

Current gap: SvelteKit loaders exist, but several components still fetch API data
from `onMount` or flow-local raw `fetch` wrappers.

Acceptable exceptions:

- Browser-only chart setup.
- SSE streaming endpoints that Eden does not model cleanly.
- IntersectionObserver / DOM-only behavior.

Refactor targets:

- Canvas CRUD should use Eden where the backend route is already typed.
- Spotify filter options (`genres`, `years`) should move to a loader or a
  documented shared loader/cache.
- Add invalidation constants before adding more mutation-driven reloads.

### 6. Turn #24 into an incremental design-system refactor

Current gap: the UI has a theme file, but components still mix app tokens,
Tailwind color literals, hardcoded hex values, and repeated async/empty/error
states.

Next step:

- Create shared primitives first: `Button`, `IconButton`, `Field`, `Badge`,
  `AsyncState`, `ModalShell`.
- Keep cards at modest radius unless a flow has a deliberate reason.
- Move the three palettes (galaxy/fire/organic) into named Tailwind v4 tokens.
- Replace one flow at a time; start with Chat or Canvas because they already use
  utilitarian app surfaces.

### 7. Trading polish as refactor, not feature work

Current gap: trading has useful domain tests and services, but UX/api code still
contains duplicated logging, raw console calls, and mixed concerns in UI
components.

Next step:

- Replace adapter/service `console.*` with `@flows/core` logger.
- Move wizard constants and formatting helpers out of `StepWizard.svelte`.
- Type the enriched market-state view model explicitly.
- Add a short trading README route/API map that matches current code.

### 8. Testing gate cleanup

Current gap: coverage is good for many packages, but the gate still has blind
spots.

- `@flows/backend` now runs Vitest and has a health-route test.
- There is no root `vitest.workspace.ts`.
- UI E2E exists but is not part of the light CI gate.

Next step:

- After splitting app startup, add backend route tests.
- Add root contract checks for "no production any", "no raw SQL outside
  repository/database files", and "no hardcoded localhost in UI API code".
- Decide whether Playwright stays manual or becomes a separate optional CI job.

## Suggested execution order

1. Tooling enforcement: lint every flow, then fix surfaced `any` in production.
2. Backend app factory split, unlocking route tests.
3. Lyrics canvas repository/service extraction.
4. UI data-access pass: Eden client factory usage in loaders and Canvas API.
5. Design-system primitives, then apply them to Chat/Canvas.
6. Trading polish/refactor.

This order keeps behavior stable while making the next change easier than the
previous one.
