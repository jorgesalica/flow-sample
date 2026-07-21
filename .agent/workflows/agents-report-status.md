---
description: Reconstruct current project status from Git, GitHub, and owner docs
---

# Report Status Workflow

1. Inspect the local branch, worktree, and recent commits:

```bash
git status --short --branch
git log --oneline --decorate -10
```

2. Inspect open GitHub issues and PRs. Distinguish executable work, umbrella issues,
deferred epics, and stale tracking.
3. Read `docs/ROADMAP.md`; use `docs/bucket.md` only for untriaged ideas.
4. Check the latest CI result and run `pnpm verify` when a fresh local baseline matters.
5. Report:
   - current branch and synchronization state
   - open PR/WIP state
   - recently merged work
   - executable queue in dependency order
   - deferred product work
   - verification evidence and any unrun checks

Do not infer completion from unchecked historical Markdown. Reconcile claims against code,
tests, commits, PRs, and current issues.
