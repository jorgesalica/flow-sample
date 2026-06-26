# AGENTS.md

Guidance for AI agents (and humans) working in this repo.

## What this is

`flow-sample` — a pnpm-workspaces playground of vertical "flows" (spotify, lyrics, trading,
chat, canvas) on an **ElysiaJS + better-sqlite3** backend (Node) and a **Svelte 5** frontend
(migrating to SvelteKit), wired together with typed **Eden Treaty** RPC. Personal project:
everything goes to `main`, minimal ceremony.

## Read first

- **[docs/conventions.md](docs/conventions.md)** — the engineering rules (the 8 golden rules,
  layering, adapters, repository pattern, testing, naming, git). Follow them; if one is
  wrong, fix it there first.
- [docs/architecture/backend.md](docs/architecture/backend.md) — bounded-context / flow layout.
- [docs/architecture/ui.md](docs/architecture/ui.md) — frontend structure.

## Commands

```bash
pnpm dev          # run all flows (UI + backend) with hot reload
pnpm build        # build every package
pnpm test         # vitest across packages
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit across packages
pnpm check        # svelte-check (UI)
```

Before pushing anything non-trivial run the full gate: `pnpm lint && pnpm typecheck &&
pnpm check && pnpm test`.

## Working rules of thumb

- **Zero `any`**, no magic strings, SQL only in `repository.ts`, external APIs only behind
  adapters, types cross the wire only via `@flows/shared`. (Details in conventions.md.)
- After changing `@flows/shared` or `@flows/core`, **rebuild them** (`pnpm build:shared`, or
  `pnpm --filter @flows/core build`) — downstream packages typecheck against the compiled
  `dist`.
- Conventional Commits in English. Commit each coherent step; push directly to `main`.
