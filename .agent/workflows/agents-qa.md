---
description: Verify real browser behavior, responsive layout, and runtime contracts
---

# QA Workflow

## Automated Browser Gate

```bash
pnpm --filter @flows/ui test:e2e
```

Playwright starts/reuses the backend and UI configured in
`packages/ui/playwright.config.ts`. Add a focused spec for critical behavior changes;
the complete deterministic suite runs serially without retries in CI on every PR.

## Manual Browser Audit

1. Exercise the affected user journey, not only the route shell.
2. Check desktop and a narrow mobile viewport.
3. Verify loading, empty, error, success, retry, and disabled states where applicable.
4. Inspect console and network failures; expected absence must not appear as noisy 4xx/5xx.
5. Check keyboard names/focus, responsive containment, and horizontal overflow.
6. For OAuth, SSE, provider, chart, drag/drop, or local persistence changes, test the real
   runtime behavior that jsdom cannot model.

Record exact commands, scenarios, viewport coverage, and any check that could not run in
the PR description.
