---
description: Verify, publish, and merge a coherent project checkpoint
---

# Checkpoint Workflow

1. Confirm the task issue, branch, and intended diff:

```bash
git status --short --branch
git diff --stat
git diff
```

2. Run the required gate:

```bash
pnpm build
pnpm verify
pnpm test:coverage
```

Add focused tests and Playwright desktop/mobile checks according to
[the testing strategy](../../docs/testing/README.md).

3. Update architecture, API, environment, flow, testing, or workflow owner docs in the
   same change.
4. Stage intentionally and create a coherent Conventional Commit. Never use
   `--no-verify`.
5. Push the task branch, open a PR to `main`, wait for green CI, and merge through
   GitHub when requested.
6. Switch back to `main`, pull with `--ff-only`, and confirm the worktree is clean.
   Run `pnpm clean:artifacts` first when local gate output is no longer needed.

Use this workflow when a task is complete, before switching fronts, or when the user asks
to commit, publish, merge, or leave the repository clean.
