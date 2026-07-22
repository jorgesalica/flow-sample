# General History

Changelog for cross-cutting concerns: documentation, DevOps, tooling.

---

## 2025-12-07 — Agent Workflows & Documentation

### Agent Workflows System

Created `.agent/workflows/` with structured documentation for consistent development:

| Workflow                  | Purpose                           |
| ------------------------- | --------------------------------- |
| `agents_flow.md`          | Entry point, quick reference      |
| `agents-checkpoint.md`    | Verify, commit, ensure stability  |
| `agents-doc-refresh.md`   | Keep docs in sync with code       |
| `agents-debug.md`         | Troubleshooting steps             |
| `agents-tests.md`         | Test execution and best practices |
| `agents-qa.md`            | Manual testing procedures         |
| `agents-digest.md`        | Context sync for new chats        |
| `agents-report-status.md` | Generate project status summary   |

### Husky Git Hooks

- Pre-commit: `pnpm lint && pnpm format`
- Pre-push: `pnpm check && pnpm test`

### Test Structure Refactoring

- Organized tests by domain: `tests/unit/spotify/`, `tests/integration/spotify/`
- Added 15 stub tests (TODOs) for future expansion

---
