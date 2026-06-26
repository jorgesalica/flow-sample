# CLAUDE.md

Guidance for Claude Code working in this repo. The full agent guide is in **@AGENTS.md** —
read it. The engineering rules are in **[docs/conventions.md](docs/conventions.md)**.

## The short version

- Monorepo (pnpm): ElysiaJS + better-sqlite3 backend (Node, `tsx` dev), **SvelteKit**
  frontend (Svelte 5 runes), typed via **Eden Treaty**. Vertical "flows" (spotify, lyrics,
  trading, chat, canvas) on shared `@flows/core` + `@flows/shared`.
- Personal project: **everything goes to `main`**, no `develop`/PRs, light hooks.

## Non-negotiables (see conventions.md for the rest)

- **Zero `any`**, no magic strings (constants in `@flows/shared`), SQL only in
  `repository.ts`, external APIs only behind adapters, cross-wire types only via
  `@flows/shared`, env only in the composition root.
- Backend: router → service → repository, pure logic in `domain/`. All 5 flows are
  hexagonal (`domain/ + backend/`).
- Frontend: Svelte 5 runes only, file-based SvelteKit routing, Eden client for data,
  Tailwind v4 (no config file).
- Tests beside code (Vitest); mock the edge, run the real domain.

## Before pushing

```bash
pnpm verify        # lint && typecheck && check && test
pnpm test:coverage # coverage per package
```

## Gotchas

- After editing `@flows/shared` or `@flows/core`, **rebuild them** (`pnpm build:shared`,
  `pnpm --filter @flows/core build`) — downstream packages typecheck against compiled `dist`.
- Conventional Commits in English. Commit each coherent step; push directly to `main`.
