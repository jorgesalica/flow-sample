# Testing Strategy

Tests are executable documentation and risk controls. Use the lowest layer that can prove
the behavior, then add broader tests for integration boundaries and critical user
journeys. Do not pursue coverage by duplicating implementation details in tests.

## Test Matrix

| Layer | Tool and shape | What to prove |
| --- | --- | --- |
| Domain | Vitest, pure unit tests | rules, boundaries, typed errors, deterministic calculations |
| Adapter | Vitest with provider edge mocked | provider mapping, failure translation, retries/fallback |
| Repository | Vitest with in-memory SQLite | SQL, hydration, absence, constraints, migrations |
| Service | Vitest with ports mocked | orchestration, calls made and deliberately not made |
| Route/application | Vitest and `app.handle()` | validation, status/error mapping, dependency wiring |
| Loader/API facade | Vitest with Eden mocked | request-scoped fetch, DTO mapping, invalidation, empty/error behavior |
| UI contract/registry | Vitest | manifest validation, state mapping, stale preservation |
| Svelte component | Testing Library | accessible behavior and user-observable state |
| Critical journey | Playwright | real navigation and desktop/mobile interaction |
| Architecture/docs | Node check scripts | repository contracts and valid local links |

## Rules

- Keep tests beside implementation unless they exercise the assembled backend or E2E UI.
- Cover happy path, boundary, absence/error, and negative space where meaningful.
- Mock external providers, clocks, randomness, and network edges; run real domain logic.
- Use factories for fixtures and fictional data only. Never use credentials or PII.
- Repository tests use isolated temporary or in-memory databases.
- Route tests import the app factory; they never start a listening process.
- Universal loader tests prove the SvelteKit `fetch` is passed into `createApiClient`.
- Component tests query by role/name when possible and assert behavior, not CSS internals.
- Playwright locators use roles, labels, or stable product semantics rather than DOM shape.
- A flaky test is a defect. Fix determinism or isolation instead of adding arbitrary waits.
- Coverage is a signal, not the definition of quality. Each package owns conservative
  statement, branch, function, and line ratchets based on measured behavior.
- Root coverage discovers every workspace with a `test:coverage` script, rejects Vitest
  packages missing that script, and prints a count-weighted summary in stable name order.

## Change Requirements

| Change | Minimum verification |
| --- | --- |
| Pure domain behavior | focused unit tests + `pnpm verify` |
| SQL/schema/repository | repository tests including migration/absence + full build |
| Route or runtime wiring | `app.handle()` integration test + full build |
| Shared DTO/package export | producer and consumer tests + full build |
| Loader, invalidation, or API facade | focused UI tests + UI build |
| Interactive/responsive UI | component tests + Playwright desktop/mobile |
| Shared theme or UI contract | primitive/token tests + every flow at desktop/mobile |
| Docs/workflow only | `pnpm check:docs` + relevant gate |

SSE, browser-only charting, drag-and-drop, keyboard reordering, persistence migration, and
multi-step flows deserve Playwright or explicit manual verification because jsdom cannot
fully model their runtime behavior.

Board changes pair pure layout and card-contract tests with registry validation and
component role/callback tests. Flow contract producers cover success, empty/malformed
data, and provider failure. The generic renderer covers loading, ready, empty, error,
stale, collapsed negative space, and expanded content without flow-specific branches.
Playwright must prove representative live summary/expansion, stale refresh preservation,
explicit keyboard reorder, native drag-and-drop, reload persistence, reset behavior, and
a no-overflow mobile fallback when those behaviors change.

## Commands And CI

```bash
pnpm verify                              # canonical local static/unit gate
pnpm build                               # all package and UI builds
pnpm test:tooling                        # architecture and coverage-runner contract tests
pnpm test:coverage                       # all package ratchets + deterministic aggregate
pnpm --filter @flows/ui test:e2e         # Playwright journeys
pnpm check:docs                          # local Markdown links
pnpm check:architecture                  # package/layer contracts
```

CI runs a clean frozen install, builds first, then runs documentation/architecture and
tooling tests, lint, TypeScript, Svelte checks, and every package coverage ratchet.
Playwright remains targeted until its runtime fixtures are fully deterministic; PRs with
interaction changes must state which Playwright or manual desktop/mobile checks were run.

## Red, Green, Refactor

For a behavioral defect or new domain rule, first add a focused failing test when
practical, implement the smallest coherent change, then refactor while the test remains
green. Documentation-only and mechanical changes do not need artificial test-first work,
but they still run the applicable gate.
