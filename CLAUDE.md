# CLAUDE.md

Guidance for Claude Code working in this repository. Read [AGENTS.md](AGENTS.md) first;
it owns the concise operating contract. Engineering details live in
[docs/conventions.md](docs/conventions.md), and the active execution order lives in
[docs/ROADMAP.md](docs/ROADMAP.md).

## Project Shape

- pnpm workspace with one ElysiaJS host and one SvelteKit/Svelte 5 UI.
- Spotify, Lyrics, Trading, Chat, and Canvas are independently testable bounded modules,
  not separately deployed applications.
- Shared runtime infrastructure belongs in `@flows/core`, cross-wire contracts in
  `@flows/shared`, and neutral music persistence in `@flows/music`.

## Non-Negotiables

- Zero explicit `any`; narrow unknown values safely.
- Route handlers validate and map HTTP. Services orchestrate. Repositories own SQL.
- External providers stay behind adapters and domain ports.
- Environment reads stay in composition roots or explicitly named config/env factories.
- New Svelte code uses runes, request-scoped loader `fetch`, typed Eden access, shared UI
  primitives, and semantic `--ui-*` tokens.
- Tests protect observable behavior at the lowest useful layer and include relevant
  absence/failure paths.

## Verification

```bash
pnpm verify
pnpm build
pnpm test:coverage
pnpm --filter @flows/ui test:e2e # for relevant UI journeys
```

After changing `@flows/shared` or `@flows/core`, rebuild it before checking consumers.

## Delivery

All non-trivial work uses a GitHub issue and a short-lived branch from updated `main`.
Open a PR to `main`, wait for green CI, merge through GitHub, then synchronize local
`main`. Never push directly to `main` and never bypass hooks with `--no-verify`.
Conventional Commits and PR descriptions are written in English. Update owner
documentation in the same PR as the behavior or contract it describes.
