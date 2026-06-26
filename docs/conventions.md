# Conventions & Best Practices

The engineering rules for this monorepo. Code is in **English**; user-facing strings and
commit messages may be in Spanish. These conventions are the source of truth — when in
doubt, follow them; when they're wrong, change them here first, then the code.

Stack: pnpm workspaces · **ElysiaJS** backend (Node, `tsx` dev) · **better-sqlite3** (raw
SQL, no ORM) · **SvelteKit** frontend (Svelte 5 runes) · **Eden Treaty** for typed RPC ·
**Vitest** for tests. Vertical "flows" (`spotify`, `lyrics`, `trading`, `chat`, `canvas`)
sit on top of shared infra (`@flows/core`) and shared types (`@flows/shared`).

---

## 1. The golden rules

1. **Zero `any`.** No explicit `any`, no `as any`. If a type is missing, create it.
   Narrow safely (`'field' in data`, `instanceof`). ESLint enforces `no-explicit-any: error`.
2. **No magic strings.** Every discrete status/kind is a `const` object (or union) in
   `@flows/shared` — `LyricsStatus`, model tiers, layer ids. Never sprinkle raw `'found'`
   / `'pending'` literals across the code.
3. **Adapter pattern for everything external.** Third-party APIs/SDKs (Spotify, LrcLib,
   Binance, the LLM providers) live behind an adapter class implementing a domain
   interface. Routes never `fetch()` an external API or `new SomeSdk()` directly.
4. **`@flows/shared` is the single source of truth** for types crossing the client↔server
   boundary. The UI imports types **only** from `@flows/shared`, never from a flow's
   internal modules.
5. **Repository pattern for all persistence.** Every SQL statement lives in a
   `repository.ts`. Routes and services never call `db.prepare(...)` directly.
6. **Thin handlers.** Route handlers map HTTP ⇆ domain and validate input. Business logic
   goes to a service or the domain layer; aim for handlers under ~15 lines.
7. **Env only in the composition root.** Read `process.env` when wiring the app
   (`createXRoutes(config)`, `createLLMClient()`), never inside `@flows/shared` or deep in
   `@flows/core` consumers. Pass config down explicitly.
8. **Svelte 5 runes only.** `$state`/`$derived`/`$effect`, `{@render ...}` (no `<slot>`),
   `import type`. New UI does not use the legacy `svelte/store` API.

---

## 2. Backend architecture

Each flow is a **bounded context** in its own package under `packages/flows/*`. The
`@flows/backend` package is only an **application host**: it builds the Elysia server, sets
global middleware (CORS, static), and mounts each flow's routes. See
[architecture/backend.md](architecture/backend.md) for the full map.

Three layers, single responsibility each:

| Layer | File | Does | Never |
| --- | --- | --- | --- |
| **Router** | `backend/routes.ts` | Elysia routes, TypeBox validation, HTTP ⇆ domain, DI via `.decorate()` | business logic, raw SQL |
| **Service** | `backend/*.service.ts` | orchestration / use-cases | raw SQL, HTTP concerns |
| **Repository** | `backend/repository.ts` | better-sqlite3 queries + row→DTO hydration | business rules |
| **Domain** | `domain/` | pure logic (trading math, canvas tokenizer), entities, typed errors, ports | Elysia, SQLite, network |

- A flow exports a factory: `createSpotifyRoutes(config)` / `createLyricsRoutes()` returning
  an `Elysia({ prefix: '/api/<flow>' })`. Dependencies are injected with `.decorate()`.
- **Don't create empty pass-through services.** Trivial CRUD can go router → repository
  directly; add a service only when there's orchestration to hold.
- Flows are **not yet uniform** (hexagonal vs flat) — unifying them is a tracked goal, not a
  blocker. New flows should follow the hexagonal layout (`domain/` + `backend/`).

### Persistence (better-sqlite3, no ORM)

- DB handles come from the `createDatabase(filename)` factory in `@flows/core`.
- Schema is created idempotently in the repository constructor with
  `CREATE TABLE IF NOT EXISTS`; column additions use a guarded `ALTER TABLE` in a
  `try/catch` (already-exists is expected).
- Use parameterized statements (`db.prepare(...).run/get/all(?, ?)`) — never string-interpolate
  user input into SQL.
- Repositories return **DTOs from `@flows/shared`**, hydrated from snake_case rows in a
  private `hydrate()`.

### Adapters & external services

- Implementation is a **class** that owns the SDK/HTTP details
  (`SpotifyApiAdapter`, `LrcLibAdapter`, the LLM providers).
- It implements a **domain interface with intent-revealing methods**
  (`fetchTracks`, `fetchLyrics`), returning provider-agnostic types.
- It's constructed in the composition root and injected; tests **mock the interface, not the
  SDK**.

### Errors

Each flow defines domain errors extending `Error` (e.g. `SpotifyAuthError`,
`SpotifyRateLimitError`). Throw those for expected failures; the `api/` layer maps them to
HTTP. Don't leak raw provider errors to the client.

---

## 3. Types: three concepts, kept apart

| Concept | Lives in | For |
| --- | --- | --- |
| Cross-boundary DTOs & domain types | `@flows/shared` | the shape the UI and API agree on |
| Runtime enums / constants | `@flows/shared` (`as const`) | usable in browser + server, no magic strings |
| HTTP validation | Elysia **TypeBox** (`t.Object`, `t.String`, …) in each route | request/response validation, feeds Eden inference |

The UI talks to the backend through **Eden Treaty** (`treaty<App>(...)`), importing
`type { App }` from the backend source — calls are end-to-end typed. Don't hand-write fetch
wrappers or hardcode URLs.

---

## 4. Frontend conventions

The UI is **SvelteKit** (Svelte 5 runes), SPA mode (`ssr = false`) via adapter-static.
Routing is file-based under `src/routes/`; each flow is a route rendering its component
from `lib/flows/<flow>/`. See [architecture/ui.md](architecture/ui.md).

- **Runes only** (`$state`, `$derived`, `$effect`). Avoid `svelte/store` (`writable`) in new
  code; module-level runes in `*.svelte.ts` for cross-component state.
- **One component per file, PascalCase.** `import type` for types in `.svelte`.
- **Keyed `{#each}`** with a stable id (`{#each items as item (item.id)}`).
- **File-based routing**: a route lives in `src/routes/<path>/+page.svelte`; link with
  `<a href="/path">`. No hand-rolled routers.
- **Tailwind v4** (CSS-first `@import 'tailwindcss'` + `@theme` tokens). Component-scoped
  `<style>` for the rest; inline `style` only for dynamic values. No `tailwind.config.js`.
- **Data access** goes through the typed Eden client (`@lib/client`), wrapped per flow in
  `api.ts`. Preferred target: SvelteKit `+page.ts` loaders (universal load) over `onMount`.

---

## 5. Testing

- **Tests are executable documentation.** Read existing tests before changing code; prefer
  red→green→refactor; never silence a red test.
- **Tests live beside the code** (`repository.ts` → `repository.test.ts`), run with **Vitest**.
- **Test the contract:** happy path + boundaries + error/absence. Verify negative space too
  (assert the thing that should *not* be there).
- **Mock the edge, run the real domain.** Mock adapters/SDKs and DB connections (see the
  lyrics repository test mocking `@flows/spotify`'s `musicDb` with an in-memory DB); never
  re-implement the logic under test inside the mock.
- **Factories over inline objects** for fixtures; override only the meaningful fields. Use
  fake data, never real credentials/PII.
- **Constants from `@flows/shared`, never magic strings**, in tests too.
- **Determinism:** no `Date.now()` / `Math.random()` in the body of a test; inject them.
- **Coverage** is configured per package via `vitest.config.ts`; keep it from regressing.

---

## 6. Naming & domain

- Code (vars, funcs, types) in **English**; user-facing strings may be Spanish.
- Repository methods read like intent: `findByTrackId`, `getPendingTrackIds`,
  `saveInterpretation`.
- Keep flow-specific vocabulary consistent (Track, Artist, Lyrics, Candle, Canvas, Token,
  Annotation).

---

## 7. Git & quality gate (personal project — minimal ceremony)

- **Everything goes to `main`.** No `develop` branch, no mandatory PRs. Commit, push, merge
  directly.
- **Light hooks:** pre-commit formats/lints staged files; pre-push runs typecheck + fast
  tests. Don't add multi-dev ceremony (branch protection, CI shards, PR templates as gates).
- **Conventional Commits** in English: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `test:`, `ci:`.
- The full local gate is `pnpm verify`-style: `pnpm lint && pnpm typecheck && pnpm check &&
  pnpm test`. Run it before pushing anything non-trivial.

---

## Do / Don't (the short version)

| Do | Don't |
| --- | --- |
| SQL in `repository.ts` | `db.prepare()` in a route/service |
| Adapter class + interface | call an SDK/`fetch()` from a handler |
| Import types from `@flows/shared` | reach into a flow's internal types from the UI |
| Eden Treaty typed client | hand-rolled fetch + hardcoded URLs |
| Pure logic in `domain/` | business rules in a route handler |
| `LyricsStatus.FOUND` / const objects | `'found'` magic strings |
| Domain error → HTTP map in `api/` | leak raw provider errors |
| env in composition root | `process.env` inside `@flows/shared` / core consumers |
| Svelte 5 runes | new `svelte/store` writables |
