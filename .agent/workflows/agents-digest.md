---
description: Context sync for new chat sessions
---

# Digest Workflow

Get up to speed quickly in a new chat.

## Priority Reading

1. **`docs/bucket.md`** - Current priorities, done items
2. **`docs/architecture/abstract-architecture.md`** - System overview
3. **Recent history** - `docs/history/backend.md`, `docs/history/ui.md`

## Project Structure

```
flow-sample/
├── packages/
│   ├── backend/    # ElysiaJS API
│   ├── ui/         # Svelte 5 frontend
│   └── shared/     # Shared types
├── docs/           # Documentation
└── .agent/         # Agent workflows
```

## Key Files

| Purpose | File |
|---------|------|
| Backlog | `docs/bucket.md` |
| Architecture | `docs/architecture/abstract-architecture.md` |
| Agent Entry | `.agent/workflows/agents_flow.md` |
| Backend Routes | `packages/backend/src/api/` |
| UI Components | `packages/ui/src/lib/components/` |

## Current State Signals

- Check `git log -5 --oneline` for recent work
- Check `bucket.md` Done section
- Check open files in user's editor

## When to Use
- Start of new chat
- Resuming after long break
- User says "ponte al dia" or "digest"
