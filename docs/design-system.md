# Flow UI Design System

The Flow UI is a dark, responsive application system shared by Spotify, Lyrics, Trading,
Chat, Canvas, and the root board. It uses semantic tokens and behavior-oriented Svelte
components so palette identity does not leak into flow implementation.

## Theme Contract

Theme definitions live in `packages/ui/src/app.css`; theme state and persistence live in
`packages/ui/src/lib/theme.ts`. The application root owns `data-theme` and the navbar
`ThemeSwitcher` offers three palettes:

| Theme | Intent | Primary accent |
| --- | --- | --- |
| `galaxy` | cool analytical default | cyan |
| `fire` | warm high-energy alternative | rose |
| `organic` | natural exploratory alternative | lime |

The selected value is stored under `flow-sample:theme`. Applying a theme updates the root
attribute and dispatches `flow-sample:theme-change`, allowing browser-rendered charts to
reapply computed CSS colors without recreating flow state. A flow must not set its own
`data-theme`; theme selection is an application-shell concern.

## Semantic Tokens

Components consume `--ui-*` variables or their Tailwind v4 semantic aliases. Palette
names are valid only in the theme definitions and selector metadata.

| Token group | Purpose |
| --- | --- |
| `--ui-background`, `--ui-nav` | page and persistent navigation surfaces |
| `--ui-surface`, `--ui-surface-raised`, `--ui-surface-subtle` | component hierarchy |
| `--ui-border`, `--ui-border-strong` | standard and emphasized boundaries |
| `--ui-text`, `--ui-text-muted` | primary and secondary copy |
| `--ui-accent`, `--ui-accent-strong` | selection and primary action |
| `--ui-focus` | keyboard focus indicator |
| `--ui-danger`, `--ui-success`, `--ui-warning` | semantic status feedback |
| `--ui-chart-1` through `--ui-chart-6` | ordered visualization series |
| `--ui-overlay`, `--ui-shadow` | modal/drawer layering and elevation |

Tailwind aliases include `app`, `foreground`, `surface`, `surface-raised`,
`surface-subtle`, `accent`, `border`, `muted`, `danger`, `success`, and `warning`.
`packages/ui/src/lib/chart-theme.ts` is the shared adapter from computed CSS variables to
Chart.js and Lightweight Charts configuration.

Retired palette variables, flow-local cosmic utilities, glass surfaces, and CSS gradients
are not part of the contract. Solid semantic surfaces provide hierarchy with predictable
contrast across all themes.

## Shared Primitives

Primitives live in `packages/ui/src/lib/components/ui` and are exported through
`@lib/components`:

- `Button` for explicit text commands and variants.
- `IconButton` for familiar compact actions with a required accessible name.
- `Field` for labels, controls, hints, and errors.
- `Badge` for compact status or category metadata.
- `AsyncState` for loading, empty, and error presentation.
- `Panel` for one bounded tool or repeated item; panels are not nested for decoration.
- `ModalShell` for dialog structure, dismissal, and focus behavior.

`FlowLayout` owns the global navbar, skip link, and standard content bounds. Chat and
Canvas use its `fullBleed` mode for dense workspaces while keeping the same shell and
responsive drawer behavior.

Compose these primitives before introducing a flow-local equivalent. A local component
is justified when it owns domain behavior, not merely different colors or copy.

## Board Pattern

The home board is a responsive CSS grid, not an HTML canvas. `FlowBoard` owns layout
state and `BoardItem` combines one registered flow with its presentation controls. The
default compact size uses three desktop columns; standard uses two and wide uses the full
row. Every size falls back to one column on mobile.

Reordering always exposes named earlier/later `IconButton` controls. Drag-and-drop is an
optional pointer enhancement, not the only interaction. Collapse uses a disclosure
button with `aria-expanded`; size uses a native select; reset is an explicit text command.
Actions update a polite live region and persist layout preferences to the active named
board. `BoardToolbar` uses a native select for board choice, a text command for creation,
and named icon actions for rename/delete; destructive deletion requires confirmation and
is disabled for the protected default board. Board items are single cards with internal
controls, never cards nested inside decorative cards.

Each registered flow supplies a `BoardCardContract`; the board owns loading and refresh
orchestration while `BoardCardContent` renders the discriminated state. Collapsed cards
retain their status and summary metrics, hiding only optional expanded content. Loading,
empty, and error use compact `AsyncState`; stale keeps the last successful content visible
with a warning. The renderer consumes only generic status, metric, and note fields and
must not import or branch on flow-specific modules.

## Interaction Rules

- Every control has an accessible name, native keyboard behavior, and visible focus.
- Icon-only actions use a familiar icon and an accessible tooltip/name.
- Loading prevents duplicate submission without hiding current context.
- Error and empty states explain the state and expose recovery when possible.
- Motion respects `prefers-reduced-motion`.
- Fixed-format controls have stable dimensions and do not shift on hover or loading.
- Desktop and mobile layouts have no incoherent overlap or horizontal page overflow.
- Component tests assert roles, names, states, and callbacks rather than CSS internals.
- Browser verification covers global theme switching and every flow at desktop/mobile
  viewports when the shared system changes.

## Enforcement

`pnpm check:architecture` scans production UI sources, including CSS, and rejects legacy
visual utilities, retired variables, gradients, and Svelte accessibility suppressions.
`pnpm --filter @flows/ui check` must finish with zero errors and zero warnings. The full
delivery gate remains `pnpm verify`, `pnpm build`, and applicable Playwright or documented
desktop/mobile verification.
