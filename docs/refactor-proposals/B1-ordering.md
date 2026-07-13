# B1 — Ordering Pass (order in place, don't change intent)

> **Status:** historical audit; execution is superseded by the current roadmap and GitHub
> issues. **Companion:** B2 vision → [GitHub issue #18](https://github.com/jorgesalica/flow-sample/issues/18)
>
> **The rule of B1:** clean and order what already exists **without moving modules
> between packages and without changing behavior/intent**. The app must look and
> work exactly the same after B1 — same routes, same data flows, same UI — just
> tidier, consistent, well-tested, and (frontend) on SvelteKit.
>
> Anything that requires **relocating code across package boundaries** or **adding
> an architectural layer** is **B2**, tracked in #18. This doc never asks you to do
> a B2 move; the B2 items are listed at the bottom only so we don't do them by
> accident.

This plan is the synthesis of three audits (backend ordering, test coverage,
SvelteKit migration). It has three independent tracks. They can be done in any
order, but the recommended sequence is **1 → 2 → 3** (cheapest/safest first).

---

## Track 1 — Backend ordering (in place, no behavior change)

### 1A. Broken / misleading tooling & docs (P0 — do first, trivially safe)

- [ ] `packages/backend/package.json` — `start` script points at `src/cli/index.ts`,
      which **does not exist**. Real entry is `src/api/app.ts` (dev) / `dist/api/app.js`
      (built). Fix `start` → `node dist/api/app.js`.
- [ ] `.husky/pre-commit` (`pnpm lint && pnpm format`) and `.husky/pre-push`
      (`pnpm check && pnpm test`) call root aggregators that resolve to `pnpm -r run …`.
      Flow packages don't all define `lint`/`check`/`format`; `-r` skips missing
      scripts, but the hooks still behave inconsistently in the git env. Decide:
      add the missing per-package scripts, or scope the hooks to packages that have them.
- [ ] Doc drift — `docs/architecture/backend.md` describes per-flow layers
      `src/api/ | src/domain/ | src/infrastructure/` that **don't exist** (actual:
      `backend/`, `domain/`, `adapter(s)/`), and a `core/src/db.ts` exporting a `db`
      singleton (actual: `core/src/db/index.ts` exporting `createDatabase()`),
      and places `shared/` under `packages/flows/` (actual: `packages/shared`).
- [ ] Doc drift — `packages/core/README.md` SimpleCache example:
      `new SimpleCache<string>(300)` is wrong twice — `SimpleCache` is not generic,
      and the constructor takes **milliseconds** (default `5*60*1000`), so `300` = 300 ms.
- [ ] Doc drift — root `README.md` "Validation: Zod, TypeBox" — zod is not used
      anywhere; validation is Elysia TypeBox (`t`). Should read just "TypeBox (Elysia)".
- [ ] Doc drift — per-flow README route tables: spotify lists `POST /api/spotify/sync`
      (real route is `/run`) and mislabels `/tracks` as paginated; trading lists
      folders `adapter/ analysis/ advisor/` that don't exist and an "OpenRouter"
      integration (code is provider-agnostic via `createLLMClient`); lyrics omits the
      `POST /:trackId/interpret` SSE feature.
- [ ] Doc drift — `docs/refactor-proposals/{README,future-architecture}.md` are dated
      2025-12, describe `packages/flows/shared/`, and treat already-done work
      (hexagonal, SQLite, component split) as "future". Mark as historical or refresh.

### 1B. Cross-flow consistency (the core "make-it-uniform" work)

- [ ] **Logging** — chat and trading use `console.*`; spotify and lyrics use
      `logger.child({ module })` from `@flows/core`. Switch chat + trading to the
      shared `logger` (same intent, consistent transport). No behavior change beyond logs.
- [ ] **Route registration shape** — spotify/lyrics/trading export factory functions
      (`create*Routes()`); chat exports an eager `const chatRoutes` that instantiates
      its service at import time. Align chat to a factory (`createChatRoutes()`).
- [ ] **Error-response envelope & HTTP status** — spotify/lyrics set explicit
      `set.status` + `{ error }`; trading always returns HTTP 200 with `{ success:false, error }`;
      chat sets no status. Also `spotify/routes.ts` returns "Track not found" as **200**
      (missing `set.status = 404`). Normalize per existing intent (don't invent new shapes).
- [ ] **`.decorate()` usage** — normalize how each flow injects deps into Elysia
      (within each flow; don't move code between packages).
- [ ] **SSE formatting** — chat and lyrics use identical framing/headers; minor
      divergences only (`{type:'done'}` vs `{type:'done',message}`; per-chunk vs
      per-stream `TextEncoder`). Align the small differences.

> ⚠️ **Decision needed (not auto-B1):** chat's route prefix is `/chat`; everyone
> else is `/api/<flow>`. Renaming to `/api/chat` is a **URL change** → only do it if
> the UI client is updated in lockstep, otherwise leave as intentional.

### 1C. Naming & barrel consistency (in-package renames only)

- [ ] spotify repo-file naming: `repository.ts` vs `artist-cache.repository.ts` vs
      `token.repository.ts` — pick one suffix convention within the package.
- [ ] spotify class prefix: `SQLiteTrackRepository`/`SQLiteTokenRepository` vs
      `ArtistCacheRepository` (equally SQLite-backed) — reconcile.
- [ ] trading barrel exports `AnalystService` *class* but `get*Service` for the other
      three — reconcile the asymmetry.
- [ ] Barrel completeness — spotify omits `ArtistCacheRepository`, `TopStats`,
      `SpotifyRoutesConfig`, `SearchOptions`/`PaginationOptions`; lyrics omits
      `LyricsData`/`LyricsRecord`/`LyricsTrackParams`/`BatchLyricsResult`/`LyricsResult`.
- [ ] spotify adapter: lone `import './types.js'` (explicit `.js`) vs extensionless
      elsewhere.
- [ ] Indentation drift (some 4-space files) — a `prettier --write` pass fixes it.

### 1D. Dead code / unused deps (delete in place)

- [ ] Remove unused deps: `zod` (spotify, chat), `dotenv` + `@flows/shared` (trading).
- [ ] chat has a `vitest` devDep but no `test` script/`tests/` dir — add tests or drop.
- [ ] Dead exports/code (verify no external use first — all packages are `private`):
      spotify `StorageError`, `StoragePort`, `SQLiteTrackRepository.search`/`findByGenre`,
      `fetchArtistGenres` shim; trading `AnalysisError`, `getRecentFractals`,
      `summarizeCandlePatterns`, `BinanceStreamEvents`, `MentorService.getLatestInsight`;
      lyrics `LrcLibSearchResult`.
- [ ] trading config-vs-hardcode mismatches (e.g. reconnect `3000` in config vs `5000`
      hardcoded in `binance-stream.ts`; Hurst thresholds in config unused vs hardcoded
      in `hurst.ts`) — **reconcile only by making values identical**; if values truly
      differ, that's a behavior change → flag, don't silently change.
- [ ] Hoist chat's duplicated `t.Object` body schema (two POST routes) to a const.
- [ ] Remove stale historical code comments (spotify "Feb 2026 migration…",
      trading `N1-N6` persona comments).

---

## Track 2 — Test coverage (lock in current behavior, no changes)

Current: trading 42, spotify 7, lyrics 24. **Untested:** core (biggest gap), chat,
backend; spotify/lyrics/trading service+route layers. Reachable: **~225 new unit tests**.

Sequence **P0 (pure, no mocks) → P1 (repo/adapter, proven mock patterns) → P2 (service/route)**.

### 2A. Infra standardization (do alongside P0)

- [ ] Add `test` scripts + `vitest.config.ts` to `chat`, `core`, `backend`
      (mirror the existing shape: `globals`, `environment:'node'`, `include:['tests/**/*.test.ts']`,
      `resolve.alias` for cross-package src imports).
- [ ] Add `vitest` devDep to `core` and `backend` (absent today). Pin all to `^4.0.15`.
- [ ] Give trading's `vitest.config.ts` the same `resolve.alias` block as the others
      (currently the odd one out) so configs differ only by alias map.
- [ ] Optional: root `vitest.workspace.ts` + coverage provider/threshold to track the push.
- [ ] Mark `shared` as intentionally test-exempt (types-only).

### 2B. P0 — pure functions (highest value / lowest cost, start here)

- [ ] **core** `SimpleCache` (TTL expiry w/ fake timers), `parseOpenAIStream`
      (SSE chunking, `[DONE]`, malformed JSON, split-chunk buffer, usage mapping),
      provider model catalogs (shape/uniqueness/defaults), gemini `formatMessages`.
- [ ] **trading** `SynthesizerService.enrichMarketState` + `interpretHurst` (feed a
      `MarketState`, assert distances/thresholds/MACD bias/`buildMessages`); domain `errors`.
- [ ] **spotify** `calculateStats` (pass a plain `TrackRepository` — no DB: genre top-10,
      decade binning, yearRange incl. empty→null); domain `errors`.
- [ ] **chat** title truncation (`slice(0,30)+'...'`), `buildLLMMessages` role mapping,
      `getModelCatalog` shape (mock the static LLM catalog).

### 2C. P1 — repositories & adapters (reuse existing patterns)

- [ ] **core** provider HTTP (`generate`/`generateStream`, mock `fetch`); gemini via `@google/genai` mock.
- [ ] **spotify** `SQLiteTokenRepository`, `SQLiteTrackRepository` (in-memory SQLite),
      `SpotifyApiAdapter` (mock axios: mapping, 401-retry, 429, cache hit/miss), `rebuildFtsIndex`.
- [ ] **trading** `fetchKlines` (mock fetch), `database.ts` prepared statements (in-memory),
      `BinanceStream` (mock `ws`).
- [ ] **lyrics** extend repo (`getLibraryWithStatus` filter SQL, `getStats` math, migration
      idempotency) + adapter batch edges (concurrency > tasks, progress, error capture).
- [ ] **chat** `ChatDatabase` (in-memory: CRUD, cascade delete, snake↔camel mapping).

### 2D. P2 — services & routes (heavier mocking)

- [ ] **core** `LLMClient` rotation/fallback (round-robin index advance, 429 fallthrough,
      "All N providers failed", stream-before-first-yield fallback, `parseProviderModel`,
      provider caching, `createRotation` no-keys throw) — ~14 tests, the headline target.
- [ ] **trading** `AnalystService`, `MentorService.parseInsight`, routes via `.handle()`.
- [ ] **spotify** `SpotifyUseCase.fetchAndSave`, routes via `.handle()` + cache behavior.
- [ ] **lyrics** routes via `.handle()` incl. the interpret-SSE path.
- [ ] **chat** `sendMessage`/`sendMessageStream` (mock LLMClient), routes via `.handle()`.

> ⚠️ **Refactor-gated (separate ticket, not B1):** `backend/src/api/app.ts` calls
> `app.listen()` at module top level, so importing `app` for route tests binds a port.
> Guarding `listen()` behind `if (require.main === module)` is a behavior change → B2/ticket.

---

## Track 3 — Frontend → SvelteKit (structure + tests, same product)

Migrate `packages/ui` from Svelte 5 + Vite SPA (hash routing) to SvelteKit, keeping
the `FlowDefinition` registry as the routing source of truth. Only user-visible change:
URLs `#/spotify` → `/spotify`.

- **Adapter:** `@sveltejs/adapter-static` with SPA fallback (`fallback: 'index.html'`),
  global `ssr=false`/`prerender=false` — the existing Elysia backend keeps serving the
  built `dist/` unchanged. (Node adapter would add a second server → rejected.)
- **Routing:** `+page.svelte` = Landing; `[flow]/+page.svelte` resolves
  `getFlow(params.flow)` and renders `<flow.component/>` — registry still drives routing,
  adding a flow stays a one-line manifest edit. `+layout.svelte` owns `<Toaster/>`.
- **Aliases:** keep `@lib`/`@components` via `kit.alias` (defer `$lib` codemod).
- **Proxy/Eden:** `server.proxy` for `/api`+`/outputs`+SSE moves into `vite.config.ts`;
  the type-only `@flows/backend/src/api/app` import carries over.

### Staged sequence (each step leaves the app working)

- [ ] (a) Scaffold SvelteKit alongside (config, `app.html`, `+layout.ts`); keep old SPA runnable.
- [ ] (b) Global shell → `+layout.svelte` (`app.css` + `<Toaster/>`).
- [ ] (c) Port Landing → `+page.svelte`; card `href` `#/x` → `/x`.
- [ ] (d) Port **Spotify** end-to-end via `[flow]/+page.svelte` (the reference pattern).
- [ ] (e) Port trading, lyrics, chat (verify SSE through the new proxy; chat is the risky one).
- [ ] (f) Verify Eden + proxy parity; build static + serve via backend for prod parity.
- [x] (g) Re-point Playwright e2e (`#/spotify` → `/spotify`) and replace stale text
      selectors with role/name locators.
- [ ] (h) Remove old `main.ts`/`App.svelte`/`index.html` + vestigial configs (last).

### Component decomposition + unit tests (vitest + @testing-library/svelte + jsdom)

- [ ] `TradingFlow.svelte` (383 lines) → extract `AdvisorInsightPanel`, `StatusPanel`,
      `CandleFeed` + `trading/format.ts` (`formatPrice`/`formatTime`).
- [ ] `StepWizard.svelte` (535 lines) → `computeStepMetrics()` + `StepMetricsPanel`,
      `WizardAnalysisPanel`, `StepNav`, and the Matrioshka `collectPreviousInsights()` (pure → testable).
- [ ] chat `MessageList` → extract `chat/markdown.ts` (`renderMarkdown`: think-tag → `<details>`,
      DOMPurify) + `chat/format.ts`; migrate chat Svelte 4 → runes component-by-component
      with tests as the safety net.
- [ ] Example test targets: `trading/format.ts` (pure), `AdvisorInsightPanel` (fixture insight),
      `chat/markdown.ts` (sanitization), `registry.ts` (dedupe / `getFlow` / copy semantics).

---

## Out of scope for B1 — B2-structural (see issue #18, do NOT do here)

These all require moving code across package boundaries or adding a layer:

- **lyrics → spotify runtime coupling** — lyrics imports spotify's `musicDb` singleton +
  `SQLiteTrackRepository`, mutates spotify's schema at construct time
  (`ALTER TABLE lyrics ADD COLUMN interpretation`), and joins spotify's tables in raw SQL.
  Untangling (separate DB / shared data package / explicit ownership) is structural.
- **spotify owns the shared `music.db`** for two flows — moving it to a neutral location is B2.
- **Missing domain layers** in chat/lyrics (no `domain/`, no `FlowError`); spotify's `FlowError`
  and trading's `TradingError` are parallel-but-unshared bases living inside their packages.
- **Adapter location/convention split** — trading `src/adapters/binance/` (plural, at root)
  vs spotify/lyrics `src/backend/adapter/` (singular). Reconciling = moving files → B2.
- **Data-access pattern split** — `SQLite*Repository` classes (spotify/lyrics) vs
  `database.ts` free functions / `ChatDatabase` (trading/chat).
- **No shared base `tsconfig`** — four identical flow tsconfigs with no `extends` base;
  introducing `tsconfig.base.json` is a structural move.
- **`backend/app.ts` `listen()` at import time** — guarding it for testability is a behavior change.
