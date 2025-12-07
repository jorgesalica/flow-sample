# Agent Workflow

Quick reference for consistent development flow.

---

## Before Starting

1. **Check branch** - Confirm not on `main`. Create feature branch if needed.
   ```bash
   git branch --show-current
   git checkout -b feat/feature-name  # if on main
   ```
2. **Kill orphan processes** - Free ports 4173, 5173 if needed.
   ```bash
   netstat -ano | findstr :4173
   taskkill /PID <pid> /F
   ```

---

## During Development

### Commit Strategy (Semantic)

Group changes by type. Use conventional commits:

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation only |
| `test:` | Tests only |
| `chore:` | Config, deps, cleanup |
| `refactor:` | Code changes without new features |

```bash
git add <related-files>
git commit -m "feat: add API caching for genres/years/stats"
```

### Documentation Types

| Location | Purpose | Update When |
|----------|---------|-------------|
| `README.md` | Project overview, quick start | Major features, commands change |
| `docs/architecture/` | Technical deep-dive | Architecture changes |
| `docs/history/backend.md` | Backend changelog | Backend features/fixes |
| `docs/history/ui.md` | UI changelog | UI features/fixes |
| `docs/refactor-proposals/future-architecture.md` | Roadmap, priorities | Features completed, priorities shift |
| `docs/flows/spotify/` | User-facing flow docs | Flow behavior changes |
| `.env.example` files | Environment setup | New env vars added |

---

## After Changes

### Verification Checklist

```bash
# 1. Lint
pnpm -r run lint

# 2. Format (optional)
pnpm -r run format

# 3. Type check
pnpm --filter @flows/ui run check

# 4. Unit tests
pnpm --filter @flows/backend run test

# 5. E2E tests (if UI changed)
pnpm --filter @flows/ui run test:e2e

# 6. Git status
git status --short
```

### Quick Smoke Test

```bash
pnpm run dev  # Start all packages
# Verify: Backend on :4173, UI on :5173
```

---

## Best Practices Learned

1. **Don't repeat checks** - If branch already verified, skip.
2. **Batch related changes** - One commit per semantic unit.
3. **Update docs alongside code** - Not as afterthought.
4. **Run tests early** - Catch issues before they compound.
5. **Kill orphans** - Port conflicts from previous runs are common.
6. **Invalidate cache on sync** - Data consistency matters.
7. **English docs** - All documentation in English.
8. **Don't spam logs** - Use debug level for verbose output.

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Port in use | `taskkill /PID <pid> /F` |
| Git tracks ignored files | `git rm -r --cached <path>` |
| tsconfig composite error | Add `"composite": true, "declaration": true` |
| @apply CSS warnings | False positives, Tailwind PostCSS handles them |
| Tests fail after interface change | Update mocks to match new interface |
