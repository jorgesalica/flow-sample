# Agent Workflows

This directory provides task-specific checklists. [AGENTS.md](../../AGENTS.md) and
[conventions](../../docs/conventions.md) remain authoritative when guidance overlaps.

## Start Every Task

1. Read `AGENTS.md`, `docs/ROADMAP.md`, and the relevant architecture/flow docs.
2. Confirm `git status --short --branch` is clean and inspect open GitHub issues/PRs.
3. Update local `main` with `git pull --ff-only`.
4. Confirm an issue exists for non-trivial work.
5. Create `codex/<issue>-<short-description>` from `main`.

## Build And Deliver

1. Read existing tests and add focused behavior coverage before or with the change.
2. Keep implementation, tests, and owner docs in the same coherent scope.
3. Run `pnpm build`, `pnpm verify`, `pnpm test:coverage`, and applicable focused
   Playwright checks. CI runs the complete browser suite.
4. Review the diff, commit with a Conventional Commit, and push the task branch.
5. Open a PR to `main` with why, impact, areas touched, verification, and `Closes #N`.
6. Wait for green CI, merge through GitHub, synchronize local `main`, and prune when
   practical.

## Workflow Index

| Workflow                  | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `agents-checkpoint.md`    | Verify and publish a coherent checkpoint  |
| `agents-tests.md`         | Select and run the correct test layers    |
| `agents-qa.md`            | Browser and responsive QA                 |
| `agents-debug.md`         | Diagnose failures without hiding symptoms |
| `agents-doc-refresh.md`   | Keep owner documentation current          |
| `agents-report-status.md` | Reconstruct Git/GitHub/project status     |
| `agents-digest.md`        | Resume work from canonical context        |
