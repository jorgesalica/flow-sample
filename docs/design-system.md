# Flow UI Design System

This document describes the implemented shared UI foundation and the direction tracked by
[issue #24](https://github.com/jorgesalica/flow-sample/issues/24). The system is dark,
workable on mobile, accessible by keyboard, and uses semantic tokens so flow identity does
not leak into component implementation.

## Implemented Tokens

Base and Tailwind theme tokens live in `packages/ui/src/app.css`. Shared components consume
semantic variables rather than palette names:

| Token | Purpose |
| --- | --- |
| `--ui-accent` | primary action and selected state |
| `--ui-accent-strong` | active/pressed accent |
| `--ui-focus` | keyboard focus indicator |
| `--ui-danger` | destructive/error action |
| `--ui-surface` | base component surface |
| `--ui-surface-raised` | elevated surface |
| `--ui-border` | standard boundary |
| `--ui-text` | primary text |
| `--ui-text-muted` | secondary text |

Palette selection uses `data-theme` on an ancestor. The default galaxy palette is cyan;
`data-theme="fire"` uses rose accents; `data-theme="organic"` uses lime accents. Palette
names configure semantic tokens but must not appear in generic component logic.

## Shared Primitives

Shared primitives live in `packages/ui/src/lib/components/ui` and are exported through
`@lib/components`:

- `Button` for text commands and variants.
- `IconButton` for familiar compact actions with an accessible name.
- `Field` for label, control, hint, and error relationships.
- `Badge` for compact status/category metadata.
- `AsyncState` for loading, empty, and error presentation.
- `ModalShell` for dialog structure, dismissal, and focus behavior.

New UI composes these primitives before introducing a flow-local equivalent. A local
component is justified when it owns domain behavior, not merely different colors or copy.

## Interaction Rules

- Every control has an accessible name and visible keyboard focus.
- Icon-only actions use a familiar icon and tooltip where meaning is not universal.
- Loading disables duplicate submission without hiding current context.
- Error and empty states explain the state and expose a recovery action when possible.
- Motion respects reduced-motion preferences.
- Layout is verified at desktop and mobile sizes without horizontal overflow.
- Component tests assert roles, names, states, and callbacks; Playwright covers responsive
  and browser-dependent interaction.

## Migration Status

The application shell, Canvas editor controls, Chat send/stop actions, Spotify controls,
and the Lyrics list, analysis, and detail modal surfaces use semantic tokens and shared
primitives. Remaining flow-local surfaces should migrate in small PRs under issue #24.
Legacy cosmic/glass utilities remain in `app.css`; removing or consolidating them is part
of that migration, not documentation housekeeping.
