# AGENTS.md

Guidance for AI agents and humans working in this repository.

## Project

`flow-sample` is a pnpm workspace of vertical flows (Spotify, Lyrics, Trading, Chat, and
Canvas) on an ElysiaJS + better-sqlite3 backend and a SvelteKit + Svelte 5 frontend. Eden
Treaty provides typed client/server RPC. Flow packages are bounded modules, not separate
deployable applications.

## Read First

- [docs/conventions.md](docs/conventions.md): engineering and delivery rules.
- [docs/ROADMAP.md](docs/ROADMAP.md): current execution order and definition of done.
- [docs/architecture/system-map.md](docs/architecture/system-map.md): package ownership.
- [docs/architecture/backend.md](docs/architecture/backend.md): backend layering.
- [docs/architecture/ui.md](docs/architecture/ui.md): frontend structure.
- [docs/testing/README.md](docs/testing/README.md): test layers and verification matrix.

If a rule is wrong, update its owner document before or with the implementation.

## Commands

```bash
pnpm dev          # all flows, backend, and UI with hot reload
pnpm build        # build every workspace package
pnpm verify       # docs + architecture + lint + types + Svelte check + tests
pnpm test:coverage
pnpm --filter @flows/ui test:e2e
```

Before pushing non-trivial work, run `pnpm verify` and `pnpm build`. UI behavior changes
require focused Playwright coverage or documented desktop/mobile verification.

After changing `@flows/shared` or `@flows/core`, rebuild it before checking downstream
packages (`pnpm build:shared` or `pnpm --filter @flows/core build`).

## Engineering Rules

- Zero explicit `any`; narrow unknown values safely.
- No magic status/kind strings; use typed constants from `@flows/shared`.
- External providers live behind adapters and domain ports.
- Cross-wire DTOs live in `@flows/shared`.
- SQL lives in repository modules.
- Route handlers validate and map HTTP; services own orchestration.
- Environment reads stay in composition roots or named env factories.
- New Svelte code uses Svelte 5 runes and typed Eden access.
- UI code composes shared primitives and semantic `--ui-*` tokens; theme state stays in
  the application shell.

Full details and justified exceptions live in [conventions](docs/conventions.md).

## Git And Delivery

This repository adapts the CCEC PR discipline to one permanent branch. There is no
`develop` or deployment pipeline; PRs target `main`.

1. Start from updated `main`: `git switch main && git pull --ff-only`.
2. Confirm a GitHub issue exists for non-trivial work.
3. Create a short-lived branch, preferably `codex/<issue>-<short-description>`.
4. Work in coherent Conventional Commits in English. Never use `--no-verify`.
5. Run `pnpm verify`, `pnpm build`, and applicable focused/E2E checks.
6. Open a PR to `main` describing why, impact, areas touched, tests, and issue linkage.
7. Wait for green CI and merge through GitHub, never by pushing to `main`.
8. Update local `main` and remove/prune the completed branch when practical.

Update owner documentation in the same PR when changing architecture, APIs, runtime
configuration, user-visible flows, testing policy, or workflow. Do not leave docs as an
unspecified follow-up.

When the user explicitly asks to merge, complete branch, commit, push, PR, checks, merge,
and local `main` synchronization in the same turn whenever possible.
