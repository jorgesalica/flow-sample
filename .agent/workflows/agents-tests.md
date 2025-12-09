---
description: Run and maintain tests, ensure coverage
---

# Tests Workflow

Keep tests passing and up-to-date.

## Running Tests

```bash
# Backend unit + integration
pnpm test

# UI E2E (requires app running)
pnpm --filter @flows/ui test:e2e

# With UI (interactive)
pnpm --filter @flows/ui test:e2e:ui
```

## Test Locations

| Type | Location |
|------|----------|
| Backend Unit | `packages/backend/tests/unit/spotify/` |
| Backend Integration | `packages/backend/tests/integration/spotify/` |
| E2E | `packages/ui/e2e/` |

## After Interface Changes

1. Update mock objects in test files
2. Check import paths
3. Run tests to verify

## Adding New Tests

- Use `.todo()` for planned tests
- Group by domain (spotify, lyrics, etc.)
- Follow existing patterns

## When to Use
- After code changes
- User says "corre tests" or "verifica"
- Before commits (Husky does this automatically)
