---
description: Generate project status summary
---

# Report Status Workflow

Generate a comprehensive project status report.

## Steps

1. **Check recent commits**
```bash
git log --oneline -10
```

2. **Review bucket.md**
- What's in Done?
- What's pending in High/Medium?

3. **Check test status**
```bash
pnpm test
```

4. **Summarize for user**
- Branch and commits
- Completed items
- Pending items
- Test status
- Suggested next step

## Report Format

```
**Estado del Proyecto - [DATE]**

**Branch:** [name] (commits ahead/behind)

**Done (today):**
- item 1
- item 2

**Pending:**
- High: [items]
- Medium: [items]

**Tests:** X passing, Y todo

**Next:** [suggestion]
```

## When to Use
- User says "reportemos estado" or "status"
- End of session
- Before major decisions
