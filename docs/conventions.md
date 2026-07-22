# Conventions & Best Practices

The engineering rules for this monorepo. Code and Conventional Commit messages are in
**English**; user-facing strings may be in Spanish. These conventions are the source of
truth: when in doubt, follow them; when they are wrong, change them here first, then the
code.

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

| Layer          | File                    | Does                                                                       | Never                   |
| -------------- | ----------------------- | -------------------------------------------------------------------------- | ----------------------- |
| **Router**     | `backend/routes.ts`     | Elysia routes, TypeBox validation, HTTP ⇆ domain, DI via `.decorate()`     | business logic, raw SQL |
| **Service**    | `backend/*.service.ts`  | orchestration / use-cases                                                  | raw SQL, HTTP concerns  |
| **Repository** | `backend/repository.ts` | better-sqlite3 queries + row→DTO hydration                                 | business rules          |
| **Domain**     | `domain/`               | pure logic (trading math, canvas tokenizer), entities, typed errors, ports | Elysia, SQLite, network |

- A flow exports a factory: `createSpotifyRoutes(config)` / `createLyricsRoutes()` returning
  an `Elysia({ prefix: '/api/<flow>' })`. Dependencies are injected with `.decorate()`.
- **Don't create empty pass-through services.** Trivial CRUD can go router → repository
  directly; add a service only when there's orchestration to hold.
- Flows are **not yet uniform** (hexagonal vs flat) — unifying them is a tracked goal, not a
  blocker. New flows should follow the hexagonal layout (`domain/` + `backend/`).

### Persistence (better-sqlite3, no ORM)

- DB handles come from the `createDatabase(filename)` factory in `@flows/core`.
- Public package imports are side-effect free: they must not open a database, create a
  data directory, run schema changes, or prepare statements against a hidden handle.
- Named database factories create the handle and initialize schema idempotently. The
  application host shares neutral Music and Analysis resources; flow route factories
  compose flow-owned persistence such as Trading and Chat.
- Repositories and persistence adapters receive their database or port explicitly.
  Tests inject isolated in-memory databases or interface fakes instead of mocking a
  module-global connection.
- Schemas use `CREATE TABLE IF NOT EXISTS`; column additions use a guarded `ALTER TABLE`
  in a `try/catch` (already-exists is expected).
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

| Concept                            | Lives in                                                     | For                                               |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Cross-boundary DTOs & domain types | `@flows/shared`                                              | the shape the UI and API agree on                 |
| Runtime enums / constants          | `@flows/shared` (`as const`)                                 | usable in browser + server, no magic strings      |
| HTTP validation                    | Elysia **TypeBox** (`t.Object`, `t.String`, …) in each route | request/response validation, feeds Eden inference |

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
- **Shared design system first**: compose primitives from `@lib/components` and consume
  semantic `--ui-*` tokens. Palette state belongs to the application root; flows do not
  define themes, gradients, legacy cosmic/glass utilities, or accessibility suppressions.
- **Browser preferences are contracts**: version and validate persisted `localStorage`
  data, reconcile it against current identifiers, and provide a safe default/reset path.
  Do not mix presentation preferences with backend or cross-boundary DTOs.
- **Boards are server state**: named boards, active selection, and layout items persist
  through `@flows/board` and typed Eden APIs. `localStorage` is allowed only for the
  versioned one-time migration of the retired v1 layout.
- **Board flows publish presentation contracts**: register immutable definitions through
  `createFlowRegistry()`, keep card DTOs generic, and render discriminated async states.
  The board must not import flow internals or select renderers by flow ID.
- **Data access** goes through the typed Eden client (`@lib/client`), wrapped per flow in
  `api.ts`. Preferred target: SvelteKit `+page.ts` loaders (universal load) over `onMount`.
  A loader must construct Eden with its event-scoped `fetch`; browser-global clients are
  reserved for interactive calls after the loader completes.

---

## 5. Testing

The test-layer matrix and change-specific verification requirements live in
[docs/testing/README.md](testing/README.md). This section defines the core rules.

- **Tests are executable documentation.** Read existing tests before changing code; prefer
  red→green→refactor; never silence a red test.
- **Tests live beside the code** (`repository.ts` → `repository.test.ts`), run with **Vitest**.
- **Test the contract:** happy path + boundaries + error/absence. Verify negative space too
  (assert the thing that should _not_ be there).
- **Mock the edge, run the real domain.** Mock adapters/SDKs; repository tests create and
  inject an isolated in-memory database handle. Never replace a module-global database
  export or re-implement the logic under test inside a mock.
- **Factories over inline objects** for fixtures; override only the meaningful fields. Use
  fake data, never real credentials/PII.
- **Constants from `@flows/shared`, never magic strings**, in tests too.
- **Determinism:** no `Date.now()` / `Math.random()` in the body of a test; inject them.
- **Coverage** is configured and ratcheted per package via `vitest.config.ts`.
  `pnpm test:coverage` discovers every participating workspace and prints one stable,
  count-weighted summary. Coverage is a signal, not a substitute for assertions at the
  correct layer.
- **Interactive UI changes** require focused Playwright coverage or documented
  desktop/mobile verification. Unit tests alone do not prove browser behavior.

---

## 6. Naming & domain

- Code (vars, funcs, types) in **English**; user-facing strings may be Spanish.
- Repository methods read like intent: `findByTrackId`, `getPendingTrackIds`,
  `saveInterpretation`.
- Keep flow-specific vocabulary consistent (Track, Artist, Lyrics, Candle, Canvas, Token,
  Annotation).

---

## 7. Git & delivery workflow

This repo uses the lightweight PR discipline from `ccec`, adapted to a single permanent
branch: **PRs target `main`**. There is no `develop` branch here.

- **Never push directly to `main`.** Work on a short-lived branch, push it, open a PR, wait
  for checks, and merge through GitHub.
- **Issue traceability:** non-trivial work starts from a GitHub issue with executable scope.
- **Branch naming:** prefer `codex/<issue>-<short-kebab-description>` for Codex-created branches.
  If a local ref layout blocks slash branches, use a clear kebab name such as
  `housekeeping-audit-workflow`.
- **Conventional Commits** in English: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `test:`, `ci:`.
- **Local gate before push:** run `pnpm build`, `pnpm verify`, and
  `pnpm test:coverage`, in that order, for non-trivial work. Add focused Playwright checks for changed UI
  journeys; CI runs the complete browser suite.
- **PR description:** include what changed, why it matters, user-visible impact, technical
  areas touched, test commands run, and related issue/refs if any.
- **Merge discipline:** check PR status before merging. Prefer GitHub server-side merge
  (`gh pr merge` or the GitHub UI) over local merges into `main`.
- **Documentation ownership:** architecture, API, runtime config, flow behavior, testing,
  and workflow changes update their owner docs in the same PR.
- **Protected local refs:** hooks reject direct commits and pushes to `main`. Explicit
  environment overrides are reserved for repository recovery, never routine delivery.
  The pre-push hook also requires the compiled backend sentinel from `pnpm build` before
  running checks and tests.

### Automated architecture contracts

`pnpm check:architecture` enforces the rules that can be detected reliably without a
heavy static-analysis framework. It checks production sources for explicit `any`,
hardcoded localhost origins in UI API modules, unsafe double casts at UI API/loader
boundaries, SQL calls outside persistence modules, environment reads outside named
config factories, direct imports between sibling flow packages, and retired UI styles or
accessibility suppressions. It also validates each workspace manifest against the allowed
package dependency graph. The command is part of `pnpm verify`, and its own behavior is
covered by `pnpm test:architecture`.

`pnpm check:docs` validates local Markdown links. `pnpm test:quality-tooling` verifies
that root scripts, CI, Dependabot, hooks, and the PR template keep the documented quality
contract. Both are part of `pnpm verify` and run in CI.

There are no sibling-flow import exceptions. Shared music persistence belongs to
`@flows/music`; generic tokenization and analysis persistence belong to
`@flows/analysis`; cross-wire DTOs remain in `@flows/shared`; generic runtime concerns
remain in `@flows/core`.

### Dependency and security policy

- Keep `pnpm-lock.yaml` committed and use frozen installs in bootstrap and CI.
- Run `pnpm security:audit` after dependency changes; CI rejects known high or critical
  production advisories.
- `pnpm test:sensitive` scans tracked and unignored repository text for credentials,
  private keys, personal email addresses, and identity data. Use fictional fixtures and
  documented placeholders.
- Run `pnpm outdated -r --compatible` to close minor/patch drift within declared ranges.
- Dependabot checks compatible pnpm minor/patch updates and GitHub Actions weekly against
  `main`; npm major PRs are ignored by configuration.
- Major upgrades require a scoped issue and focused migration verification. Do not mix
  them into an unrelated security patch.
- A root override is allowed only for a transitive advisory when the direct owner still
  exposes a compatible vulnerable range. Declare the safe package at the workspace root,
  document why, and remove the override after the upstream graph resolves safely.

---

## Do / Don't (the short version)

| Do                                   | Don't                                                 |
| ------------------------------------ | ----------------------------------------------------- |
| SQL in `repository.ts`               | `db.prepare()` in a route/service                     |
| Adapter class + interface            | call an SDK/`fetch()` from a handler                  |
| Import types from `@flows/shared`    | reach into a flow's internal types from the UI        |
| Eden Treaty typed client             | hand-rolled fetch + hardcoded URLs                    |
| Pure logic in `domain/`              | business rules in a route handler                     |
| `LyricsStatus.FOUND` / const objects | `'found'` magic strings                               |
| Domain error → HTTP map in `api/`    | leak raw provider errors                              |
| env in composition root              | `process.env` inside `@flows/shared` / core consumers |
| Svelte 5 runes                       | new `svelte/store` writables                          |
