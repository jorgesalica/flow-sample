# Agent Workflows - Entry Point

Reference hub for agent workflows. Each sub-workflow has its own doc for details.

---

## Available Workflows

| Workflow | Purpose | Doc |
|----------|---------|-----|
| **checkpoint** | Verify, commit, ensure app stable | `agents-checkpoint.md` |
| **doc-refresh** | Update README, history, docs/ | `agents-doc-refresh.md` |
| **debug** | Troubleshooting steps when stuck | `agents-debug.md` |
| **tests** | Run tests, verify coverage, best practices | `agents-tests.md` |
| **qa** | Manual testing, run app, verify UI | `agents-qa.md` |
| **digest** | Context sync for new chats | `agents-digest.md` |
| **report-status** | Generate project status summary | `agents-report-status.md` |

---

## Quick Reference

### Checkpoint (most common)
```bash
pnpm check && pnpm test
git add . && git commit -m "..."
# Verify app runs if major changes
```

### Doc Refresh
Update after features: `README.md`, `docs/history/`, `docs/flows/`, `bucket.md`

### Digest (new chat)
Read: `docs/bucket.md`, `docs/architecture/`, recent `docs/history/`

---

## Commit Prefixes
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `test:` Tests
- `chore:` Config, cleanup
- `refactor:` Code restructure

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Port in use | `taskkill /PID <pid> /F` |
| Lint fails on commit | Husky pre-commit, fix errors first |
| Tests fail | Check mocks match interfaces |

---

*Sub-workflows will be created as we refine them.*
