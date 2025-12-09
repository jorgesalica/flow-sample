---
description: Verify code quality, commit changes, ensure app stability
---

# Checkpoint Workflow

Run this when you have accumulated changes and want to ensure stability.

## Steps

1. **Run checks**
```bash
pnpm check
pnpm test
```

2. **Review changes**
```bash
git status --short
git diff --stat
```

3. **Commit with semantic message**
```bash
git add .
git commit -m "type: description"
```

4. **Verify app runs** (if major changes)
```bash
pnpm dev
# Check browser at localhost:5173
```

## When to Use
- After completing a feature
- Before switching context
- When user says "checkpoint" or "commitea"
- After many accumulated edits
