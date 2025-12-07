---
description: Troubleshooting steps when things are difficult
---

# Debug Workflow

When something is taking too long or failing repeatedly.

## General Approach

1. **Read the error carefully** - Full stack trace
2. **Check recent changes** - `git diff HEAD~1`
3. **Isolate the issue** - Minimal reproduction
4. **Search codebase** - `grep_search` for related code
5. **Check dependencies** - Version conflicts?

## Common Issues

### Port in use
```bash
netstat -ano | findstr :4173
taskkill /PID <pid> /F
```

### Build fails
```bash
pnpm clean
pnpm install
pnpm build
```

### Tests fail after interface change
- Update mocks to match new interfaces
- Check test file imports

### Type errors
- Run `pnpm check` for full output
- Check tsconfig includes

## When to Escalate
- After 3 failed attempts
- Ask user for more context
- Suggest alternative approaches
