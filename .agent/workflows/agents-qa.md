---
description: Manual testing and verification
---

# QA Workflow

Run the app and verify functionality manually.

## Starting the App

```bash
pnpm dev
# Backend: http://localhost:4173
# UI: http://localhost:5173
```

## Basic Checks

1. **Landing page loads** - See flow cards
2. **Navigate to Spotify Flow** - Click card
3. **Tracks display** - Grid shows tracks (if synced)
4. **Search works** - Type in search bar
5. **Filters work** - Open filter panel, apply filters
6. **OAuth flow** - Click Connect Spotify (if not connected)

## After Changes

| Change Type | Verify |
|-------------|--------|
| UI component | Visual appearance, interactions |
| API endpoint | Response in browser devtools |
| Auth flow | Full login/redirect cycle |
| Filters | Apply and clear filters |

## Reporting Issues
- Note exact steps to reproduce
- Capture console errors
- Note browser/viewport

## When to Use
- After UI changes
- User says "proba" or "verifica en la app"
- Before releasing features
