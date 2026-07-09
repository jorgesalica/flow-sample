# AGENTS.md

Guidance for AI agents (and humans) working in this repo.

## What this is

`flow-sample` — a pnpm-workspaces playground of vertical "flows" (spotify, lyrics, trading,
chat, canvas) on an **ElysiaJS + better-sqlite3** backend (Node) and a **SvelteKit + Svelte 5**
frontend, wired together with typed **Eden Treaty** RPC. Personal project with a
lightweight PR workflow: short-lived branches merge back to `main`.

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
pnpm check && pnpm test`. Run `pnpm build` when entrypoints, package exports, or frontend
build behavior changed.

## Working rules of thumb

- **Zero `any`**, no magic strings, SQL only in `repository.ts`, external APIs only behind
  adapters, types cross the wire only via `@flows/shared`. (Details in conventions.md.)
- After changing `@flows/shared` or `@flows/core`, **rebuild them** (`pnpm build:shared`, or
  `pnpm --filter @flows/core build`) — downstream packages typecheck against the compiled
  `dist`.
- Conventional Commits in English. Commit each coherent step on a branch; never push
  directly to `main`.

## Git & delivery workflow

Adapted from the `ccec` workflow, but simplified for this repo: there is no `develop`
branch, so PRs target `main`.

1. Start from updated `main`: `git switch main && git pull --ff-only`.
2. Create a short-lived branch. Prefer `codex/<short-kebab-description>` for Codex work;
   if the local ref layout cannot support slash branches, use a clear kebab name.
3. Work in small coherent commits. Do not use `--no-verify`.
4. Verify locally before pushing:
   `pnpm lint && pnpm typecheck && pnpm check && pnpm test`.
   Add `pnpm build` for non-trivial backend/frontend/package changes.
5. Push the branch and open a PR to `main`.
6. Fill the PR with:
   - what changed and why
   - user-visible impact
   - files/areas touched
   - how it was tested
   - related issue or `Refs` note when applicable
7. Check PR status before merging. Merge through GitHub, not by pushing to `main`.
8. After merge, update local `main` and prune/delete the completed branch when practical.

If the user explicitly asks to "merge it", the agent should complete the full delivery
cycle in the same turn whenever possible: branch, commit, push, PR, checks, merge, and
report the merged PR URL.
