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
│       ├── pages/Landing.svelte  # the board UI (flow cards + live stats)
│       ├── components/
│       │   ├── layout/           # Navbar, FlowLayout
│       │   ├── common/           # InfiniteScroll, …
│       │   └── canvas/           # TokenRenderer, TokenTooltip, LayerToggle
│       └── flows/
│           ├── registry.ts       # FlowDefinition + registerFlow/getFlows/getFlow
│           ├── index.ts          # the board manifest (registers every flow)
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
flow's page component from `lib/flows/<flow>/`. The home route renders the board
(`Landing.svelte`), which links to each flow via `<a href="/spotify">` etc. (The old
`#/`-hash router was removed in the SvelteKit migration.)

## Flows registry

`lib/flows/registry.ts` defines `FlowDefinition` (id, name, icon, description, route,
color, `getStats()`); `lib/flows/index.ts` registers each flow. The board reads the
registry to render cards and pull live stats. Each flow's `index.ts` exports its
`FlowDefinition`; its `api.ts` wraps the Eden calls; `stores.ts` holds flow state.

## Data access

The typed Eden client lives in `lib/client.ts` (`treaty<App>(...)`, importing
`type { App }` from the backend) — calls like `api.api.spotify.tracks.search.get({...})`
are fully typed. In dev, Vite proxies `/api` and `/outputs` to the backend on `:4173`.

Persistent route data belongs in SvelteKit `+page.ts` universal loaders and uses Eden.
Loaders register stable dependency keys from `lib/invalidation.ts`; successful mutations
call the `lib/invalidate.ts` adapter so SvelteKit reruns only the affected loader. Flow
components receive loader data as props and hydrate their runes state reactively.

`onMount` remains appropriate for browser-only behavior such as chart construction,
`IntersectionObserver`, URL cleanup after OAuth redirects, and SSE subscriptions. Raw
`fetch` is reserved for endpoints Eden cannot model cleanly; each exception must stay in
the flow's `api.ts` and be covered by a contract test.

## Styling

Tailwind v4, CSS-first: `app.css` does `@import 'tailwindcss'` and declares brand tokens
in `@theme { … }` ("cosmic" dark theme + glassmorphism). Component-scoped `<style>` for
the rest; inline `style` only for dynamic values. There is no `tailwind.config.js` (v4).

## Testing

Unit/component tests run under Vitest + `@testing-library/svelte` (jsdom), beside the code
as `*.svelte.test.ts` / `*.test.ts`. Mock the Eden client (`@lib/client`) — never hit the
network. Chart-heavy components (chart.js / lightweight-charts) are not unit-tested under
jsdom. E2E lives in `e2e/` (Playwright).

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
