---
description: Select, run, and maintain the repository test layers
---

# Tests Workflow

The canonical policy is [docs/testing/README.md](../../docs/testing/README.md).

## Commands

```bash
pnpm build
pnpm verify
pnpm test:coverage
pnpm --filter @flows/ui test:e2e
```

Use package filters for rapid feedback, but finish non-trivial work with the root gate.

## Locations

| Layer                                | Location                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Architecture/docs/quality            | `scripts/*.test.mjs`, `scripts/check-*.mjs`                               |
| Core/shared infrastructure           | `packages/core/tests`, package-local tests                                |
| Flow domain/repository/service/route | `packages/flows/<flow>/tests`                                             |
| Neutral capabilities                 | `packages/music/tests`, `packages/analysis/tests`, `packages/board/tests` |
| Backend composition                  | `packages/backend/tests`                                                  |
| UI loaders/components/contracts      | `packages/ui/src/**/*.test.ts`                                            |
| Browser journeys                     | `packages/ui/e2e`                                                         |

## Rules

- Test observable contracts, including boundary, absence/error, and negative space.
- Mock external providers, not domain behavior.
- Use in-memory or temporary SQLite databases for repository tests.
- Do not add `.todo()` placeholders as a substitute for executable scope; create an issue
  when work is intentionally deferred.
- A flaky test is a defect. Fix isolation or determinism instead of adding waits.
- Keep sensitive-data and quality-contract tests green when changing tooling or workflow.
- Husky is a guard, not the complete gate; run the required commands explicitly.
