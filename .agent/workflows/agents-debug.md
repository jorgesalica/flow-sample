---
description: Diagnose failures methodically without hiding symptoms
---

# Debug Workflow

1. Capture the complete error, request/response, and reproduction steps.
2. Inspect `git status`, the relevant diff, logs, and existing behavior tests.
3. Search with `rg`; identify the smallest layer that owns the failure.
4. Reproduce with the narrowest deterministic test or request.
5. Add or strengthen a failing test when the behavior can be isolated.
6. Fix the owning layer, then run focused checks followed by `pnpm verify` and `pnpm build`.

Do not clear databases, delete build trees, kill unrelated processes, weaken assertions,
or bypass hooks to make a symptom disappear. Verify an absolute target before any
destructive filesystem action. External-provider failures should be logged server-side
and mapped to stable client contracts.

Escalate only after the same blocking condition has been reproduced and local evidence
cannot resolve it; report what was tried and what information is missing.
