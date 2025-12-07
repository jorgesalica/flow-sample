# Agent Workflow

Quick reference for consistent development flow.

---

## Before Starting

1. **Check branch** - Confirm not on `main`. Create feature branch if needed.
2. **Kill orphan processes** - Free ports 4173, 5173 if needed.

---

## During Development

### Commit Strategy

**Goal:** Semantic grouping without being too granular or too broad.

| ✅ Good | ❌ Avoid |
|---------|----------|
| One commit per feature/fix batch | File-by-file commits |
| Multiple related files together | Mixing unrelated features |
| "feat: add caching + routes" | "feat: everything" |

```bash
# Batch related files in one semantic commit
git add packages/backend/src/api/*.ts packages/backend/src/infrastructure/cache.ts
git commit -m "feat: add API caching for genres/years/stats"
```

**Prefixes:**
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation only
- `test:` Tests only
- `chore:` Config, deps, cleanup
- `refactor:` Code changes without new features

### Documentation Types

| Location | Update When |
|----------|-------------|
| `README.md` | Major features, commands change |
| `docs/history/backend.md` | Backend features/fixes |
| `docs/history/ui.md` | UI features/fixes |
| `docs/refactor-proposals/future-architecture.md` | Features completed, priorities shift |
| `.env.example` files | New env vars added |

---

## After Changes

### Verification Checklist

```bash
pnpm --filter @flows/ui run check     # Type check
pnpm --filter @flows/backend run test # Unit tests
pnpm --filter @flows/ui run test:e2e  # E2E tests (if UI changed)
git status --short
```

---

## Best Practices

1. **Don't repeat checks** - Branch verified once is enough.
2. **Batch related changes** - One commit per semantic unit.
3. **Update docs alongside code** - Not as afterthought.
4. **Kill orphans** - Port conflicts from previous runs are common.
5. **English docs** - All documentation in English.

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Port in use | `taskkill /PID <pid> /F` |
| Git tracks ignored files | `git rm -r --cached <path>` |
| tsconfig composite error | Add `"composite": true` |
| @apply CSS warnings | False positives (Tailwind PostCSS) |
| Tests fail after interface change | Update mocks |

---

## Bucket (Future Tasks)

- Protect main with Husky pre-push hook
- Create custom favicon (space/flow theme)
- UI refactor: split components, cleanup code
- More unit test edge cases
- Docker containerization
- GitHub Actions CI/CD
