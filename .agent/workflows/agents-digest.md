---
description: Restore canonical project context when resuming work
---

# Digest Workflow

## Read First

1. `AGENTS.md`
2. `docs/ROADMAP.md`
3. `docs/conventions.md`
4. `docs/architecture/system-map.md`
5. `docs/testing/README.md`
6. The relevant flow/architecture owner docs and issue acceptance criteria

## Reconstruct State

```bash
git status --short --branch
git log --oneline --decorate -10
```

Then inspect open GitHub PRs/issues and the latest CI result. `docs/bucket.md` contains
untriaged ideas, not the execution queue. Historical/refactor-proposal documents provide
context but do not override the roadmap or current issues.

Confirm the latest user request before continuing a prior plan, especially after an
interruption or context compaction.
