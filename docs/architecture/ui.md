# UI Architecture

For the cross-package map and refactor lanes, see
[System Map and Refactor Boundaries](./system-map.md).

The frontend is a **SvelteKit** app (Svelte 5 runes) that talks to the Elysia backend
through a typed **Eden Treaty** client. It is organized as a set of vertical **flows**
(spotify, lyrics, trading, chat, canvas) hung on a central board.

## Tech Stack

| Technology         | Version | Purpose                                     |
| ------------------ | ------- | ------------------------------------------- |
| **SvelteKit**      | 2.x     | App framework + file-based routing          |
| **Svelte**         | 5.x     | UI framework (runes)                        |
| **adapter-static** | 3.x     | Builds a client-rendered SPA (`ssr = false`) |
| **Vite**           | 7.x     | Build tool & dev server                     |
| **Tailwind CSS**   | 4.x     | Utility-first styling (`@tailwindcss/vite`) |
| **Eden Treaty**    | 1.x     | End-to-end typed API client                 |
| **TypeScript**     | 5.x     | Type safety                                 |
| **Vitest + Testing Library** | 4.x | Component & unit tests (jsdom)         |
| **Playwright**     | 1.x     | E2E                                         |

## Rendering model

SPA mode: `src/routes/+layout.ts` sets `ssr = false` (the app uses browser-only chart
libraries) and `adapter-static` emits a static bundle with an `index.html` fallback. The
backend can serve that bundle, or it can be hosted as static files. Data is fetched
client-side through the Eden client.

## Directory Structure

```text
ui/
├── src/
│   ├── app.html                  # HTML shell (%sveltekit.head% / %sveltekit.body%)
│   ├── app.css                   # Tailwind v4 (@import 'tailwindcss') + @theme tokens
│   ├── routes/
│   │   ├── +layout.svelte        # Global shell: <Toaster/> + {@render children()}
│   │   ├── +layout.ts            # ssr = false; prerender = false
│   │   ├── +page.svelte          # The board (renders pages/Landing.svelte)
│   │   ├── spotify/+page.svelte  # → flows/spotify/SpotifyFlow.svelte
│   │   ├── lyrics/+page.svelte
│   │   ├── trading/+page.svelte
│   │   ├── chat/+page.svelte
│   │   └── canvas/+page.svelte
│   └── lib/
│       ├── client.ts             # Eden Treaty client (typed against the backend App)
│       ├── toast.ts              # svelte-5-french-toast wrapper (Toaster, showError…)
│       ├── types.ts              # local UI types (domain types come from @flows/shared)
│       ├── pages/
│       │   ├── Landing.svelte    # validated flow-manifest handoff
│       │   ├── board-layout.ts   # versioned local layout contract + operations
│       │   └── components/
│       │       ├── FlowBoard.svelte # state, persistence, reset, drag/drop
│       │       ├── BoardItem.svelte # flow presentation + accessible controls
│       │       └── BoardCardContent.svelte # generic async/summary/expansion renderer
│       ├── components/
│       │   ├── layout/           # Navbar, FlowLayout
│       │   ├── common/           # InfiniteScroll, …
│       │   └── canvas/           # TokenRenderer, TokenTooltip, LayerToggle
│       └── flows/
│           ├── board-card.ts     # typed card states, content, and stats adapter
│           ├── registry.ts       # validated FlowDefinition registry factory
│           ├── index.ts          # immutable board manifest
│           └── <flow>/           # SpotifyFlow.svelte + components/ + api.ts + stores.ts + index.ts
├── vite.config.ts                # sveltekit() + tailwindcss(); /api + /outputs dev proxy
├── svelte.config.js              # adapter-static (SPA), @lib/@components aliases
├── vitest.config.ts              # jsdom + svelte() plugin (unit/component tests)
├── vitest-setup.ts               # jsdom polyfills (matchMedia, ResizeObserver, …)
├── eslint.config.js
└── tsconfig.json                 # extends ./.svelte-kit/tsconfig.json
```

## Routing

File-based. Each flow is a route under `src/routes/<flow>/+page.svelte` that renders the
flow's page component from `lib/flows/<flow>/`. The home route renders the flow index
(`Landing.svelte`), which delegates the validated manifest to `FlowBoard`. The board
loads each card contract independently. Available flows retain route links inside each
`BoardItem`; unavailable and failed flows remain non-interactive. (The old `#/`-hash router was removed in the
SvelteKit migration.)

## Flows registry

`lib/flows/registry.ts` defines `FlowDefinition` (id, name, icon, description, route, and
`boardCard`) plus `createFlowRegistry()`. Registry construction rejects duplicate IDs,
missing metadata, invalid routes, and contracts without `boardCard.load`; lookups return
defensive manifest copies. `lib/flows/index.ts` builds the immutable application manifest.

`lib/flows/board-card.ts` owns the board-only presentation boundary. A contract resolves
to `ready`, `empty`, or `error`; `FlowBoard` adds `loading` while a request is pending and
converts refresh failures with prior data into `stale`. Summary status and metrics remain
visible while collapsed; optional expanded metrics and notes render only when open.
Spotify and Lyrics own representative rich contracts. Trading, Chat, and Canvas adapt
their existing status/count response through `createStatsBoardCard()`. `BoardCardContent`
renders every flow from the discriminated contract and never branches on a flow ID.

Board DTOs are UI presentation types because they never cross the backend boundary.
Provider/domain DTOs continue to live in `@flows/shared`; each flow's `api.ts` wraps its
typed Eden calls, and `stores.ts` holds reusable flow state where needed.

## Board layout

`pages/board-layout.ts` owns the browser-only presentation contract. Version 1 stores an
ordered list of `{ id, collapsed, size }` items under `flow-sample:board-layout`.
`FlowBoard` reconciles that data against current registry IDs: removed flows are dropped,
new flows are appended in manifest order, and malformed or mismatched-version data falls
back to the default layout. Layout data never contains flow DTOs, stats, or server state.

Explicit earlier/later buttons are the accessible reorder baseline. Native drag-and-drop
uses the same immutable reorder operation as a progressive enhancement. Collapse, size,
and reset changes persist immediately and announce their result through a polite live
region. CSS grid maps compact, standard, and wide preferences to desktop columns and
falls back to one column on mobile. Named or server-persisted boards remain separate
work owned by issue #44.

## Data access

The typed Eden client lives in `lib/client.ts` (`treaty<App>(...)`, importing
`type { App }` from the backend) — calls like `api.api.spotify.tracks.search.get({...})`
are fully typed. In dev, Vite proxies `/api` and `/outputs` to the backend on `:4173`.

Persistent route data belongs in SvelteKit `+page.ts` universal loaders and uses Eden.
Each loader creates a request-scoped client with `createApiClient(fetch)`, passing the
`fetch` supplied by its `load` event. Using the browser-global client inside a loader
bypasses SvelteKit request tracking and emits runtime warnings.
Loaders register stable dependency keys from `lib/invalidation.ts`; successful mutations
call the `lib/invalidate.ts` adapter so SvelteKit reruns only the affected loader. Flow
components receive loader data as props and hydrate their runes state reactively.

`onMount` remains appropriate for browser-only behavior such as chart construction,
`IntersectionObserver`, URL cleanup after OAuth redirects, and SSE subscriptions. Raw
`fetch` is reserved for endpoints Eden cannot model cleanly; each exception must stay in
the flow's `api.ts` and be covered by a contract test. Client-side history updates use
`pushState`/`replaceState` from `$app/navigation`, never `window.history` directly.

Chat uses Eden for request/response endpoints and same-origin `fetch` only for SSE. Stream
payloads use the `ChatStreamEvent` discriminated union from `@flows/shared`; the API
facade validates parsed JSON before passing an event to the store.

Spotify, Lyrics, and Trading request/response endpoints use direct Eden inference from
TypeBox response schemas; their production loaders and API facades do not cast wire
payloads. Lyrics keeps same-origin `fetch` only for interpretation SSE and validates
each parsed `LyricsInterpretationEvent` before exposing it to components. Trading uses
`EventSource` for live state/candles and validates every parsed payload before mutating
its runes store. Architecture checks reject unsafe double casts in all three flow
surfaces.

## Styling

Tailwind v4, CSS-first: `app.css` does `@import 'tailwindcss'` and owns semantic `--ui-*`
tokens plus their Tailwind aliases. `lib/theme.ts` and the navbar `ThemeSwitcher` apply
galaxy, fire, or organic at the application root and persist the selection; flows never
own palette state. Shared primitives live under `components/ui`, while component-scoped
styles consume semantic tokens and reserve inline `style` for runtime values.

Chart.js and Lightweight Charts receive computed colors through `lib/chart-theme.ts` and
react to the global theme-change event. There is no `tailwind.config.js` (v4), legacy
cosmic/glass utility layer, or gradient-based production UI.

## Testing

Unit/component tests run under Vitest + `@testing-library/svelte` (jsdom), beside the code
as `*.svelte.test.ts` / `*.test.ts`. Mock the Eden client (`@lib/client`) — never hit the
network. Pure chart-theme, board-layout, registry, and card-contract mapping are
unit-tested. The generic renderer covers every async state and negative space. Chart
canvas rendering, live summary/expansion, stale refresh, keyboard reorder, native
drag-and-drop, persistence reloads, and responsive behavior are verified in a real
browser. E2E lives in `e2e/` (Playwright).

Vitest uses the plain Svelte plugin, so `src/test/app-navigation.ts` supplies the unit-test
adapter for SvelteKit's virtual navigation module. Tests may mock that adapter to assert
navigation without mutating shared browser history.

## Tooling

| Script          | Command                                   |
| --------------- | ----------------------------------------- |
| `dev`           | `vite dev` (port 5173)                     |
| `build`         | `vite build` (adapter-static → `build/`)   |
| `preview`       | `vite preview`                            |
| `check`         | `svelte-check --tsconfig ./tsconfig.json` |
| `test`          | `vitest run`                              |
| `test:coverage` | `vitest run --coverage`                   |
| `test:e2e`      | `playwright test`                         |
| `lint`          | `eslint src`                              |
