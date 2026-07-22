# @flows/ui

SvelteKit and Svelte 5 browser application for the Flow Sample board and dedicated flow
workspaces.

## Ownership

- File-based routes and universal loaders under `src/routes`.
- Named-board composition, flow registry, and generic board-card rendering.
- Flow surfaces under `src/lib/flows/<flow>`.
- Shared accessible primitives, semantic design tokens, and application theme state.
- Typed Eden API facades, validated SSE adapters, and browser-only interaction state.

The UI imports cross-wire contracts from `@flows/shared`; it does not import backend flow
internals. Persistent server state comes from loaders and Eden. `localStorage` is limited
to versioned browser preferences and the one-time retired board-layout migration.

## Routes

The home route renders the active named board. `/spotify`, `/lyrics`, `/trading`, `/chat`,
and `/canvas` render dedicated flow workspaces. Vite proxies `/api` and `/outputs` to the
backend at `http://localhost:4173` during development.

## Commands

```bash
pnpm --filter @flows/ui dev
pnpm --filter @flows/ui build
pnpm --filter @flows/ui lint
pnpm --filter @flows/ui check
pnpm --filter @flows/ui test
pnpm --filter @flows/ui test:coverage
pnpm --filter @flows/ui test:e2e
```

Vitest and Testing Library cover loaders, API facades, state, contracts, and components.
Playwright covers real navigation and critical desktop/mobile interaction. See
[UI architecture](../../docs/architecture/ui.md) and the
[testing strategy](../../docs/testing/README.md).
