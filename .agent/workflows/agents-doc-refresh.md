---
description: Update project documentation after changes
---

# Doc Refresh Workflow

Keep documentation in sync with code changes.

## What to Update

| Doc | When |
|-----|------|
| `README.md` | Major features, commands change |
| `docs/bucket.md` | Task completed, new ideas |
| `docs/history/backend.md` | Backend changes |
| `docs/history/ui.md` | UI/Frontend changes |
| `docs/flows/*.md` | Flow-specific features |
| `.env.example` | New env vars |

## Steps

1. **Identify what changed** - Feature, fix, config?
2. **Update bucket.md** - Mark task done, add new items
3. **Update history** - Add entry with date
4. **Update README** - If user-facing changes
5. **Commit docs separately** - `docs: update ...`

## When to Use
- After completing features
- User says "actualiza docs" or "doc refresh"
- Before ending session
