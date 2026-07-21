# Architecture

Start here when changing package boundaries, backend layering, frontend data
access, or the flow model.

## Current Maps

- [System Map and Refactor Boundaries](./system-map.md) - workspace map,
  package responsibilities, flow extraction contract, and refactor lanes.
- [Backend Architecture](./backend.md) - Elysia host, bounded-context flow
  packages, repositories, services, adapters, and LLM core.
- [UI Architecture](./ui.md) - SvelteKit routes, flow registry, Eden client,
  frontend flow modules, and testing.
- [Server Architecture](./server.md) - backend runtime details.

## Working Rule

The package split is intentional: `packages/backend` hosts the app,
`packages/ui` renders it, `packages/core` owns shared infrastructure,
`packages/shared` owns cross-boundary contracts, `packages/music` owns neutral music
persistence, `packages/board` owns named-board application composition, and
`packages/flows/*` own backend bounded contexts.

Keep the separation, but do not treat each flow as a separately deployable app
until its contracts are explicit and tested.
