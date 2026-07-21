# Roadmap

This document owns product direction and execution order. GitHub issues own actionable
scope and acceptance criteria. Completed migration details belong in
[project history](history/README.md), not in the active queue.

## North Star

Flow Sample is an improvisational analysis board for things the user cares about, with
music as the first domain. Flows remain bounded and independently routable, while the
home experience presents them as movable, collapsible items with live summaries and
optional expansion.

The visual language is dark, restrained, and combines three semantic accent families:
galaxy, fire, and organic. Accessibility and mobile behavior are requirements, not
follow-up polish.

## Current State

- All five flows use explicit domain/backend boundaries.
- SvelteKit loaders, typed Eden access, and centralized invalidation are established.
- Spotify and Lyrics expose explicit response DTOs, injectable application services,
  deliberate absence/provider statuses, and validated SSE boundaries without UI casts.
- Trading exposes typed market/wizard contracts, injected repository/provider services,
  deliberate external/AI failure statuses, and validated SSE payloads without UI casts.
- Runtime environment ownership is explicit and injected.
- Architecture contracts enforce key package and layering rules.
- Shared UI primitives and the galaxy/fire/organic theme system cover every production
  flow, including browser-rendered charts and responsive workspaces.
- Named boards render the flow registry as reorderable, collapsible, resizable items with
  SQLite persistence, active-board recovery, keyboard controls, drag-and-drop, and a
  one-time migration from the browser-only v1 layout.
- Registered flows publish typed board summaries and optional expanded content. Spotify
  and Lyrics provide richer live contracts; the remaining flows use the generic stats
  adapter. Loading, empty, error, and stale data share one renderer.
- Architecture contracts reject retired UI styles, gradients, and accessibility
  suppressions.
- CI builds the monorepo and runs lint, type checks, Svelte checks, tooling contracts,
  and conservative per-package coverage ratchets with a deterministic aggregate.
- Backend workspaces share compiler defaults through one root config; UI API/loaders
  reject unvalidated double casts at the architecture gate.
- Short-lived branches and PRs to `main` are the delivery contract.

Shared music database ownership is neutral in `@flows/music`; Spotify and Lyrics no
longer import each other's internals.

## Execution Queue

The current queue closes architectural and testing debt before new product features:

1. **Final Board reconciliation
   ([#18](https://github.com/jorgesalica/flow-sample/issues/18))**: audit the assembled
   architecture and browser behavior, close satisfied umbrella scope, and turn any real
   residual work into a precise follow-up issue.

Relationships and graph edges get a separate issue only after the named-board foundation
is proven.
A DOM/CSS board is the default; an HTML canvas or graph library
requires an interaction-driven spike first.

## Deferred Epics

- [#23 LLM depth](https://github.com/jorgesalica/flow-sample/issues/23): prompt depth,
  contextual analysis, singing coach, and multi-agent orchestration.
- [#27 Music trio](https://github.com/jorgesalica/flow-sample/issues/27): playlists,
  song viewer, karaoke, and richer annotations.

They remain intentionally outside the current execution queue and are not prerequisites
for the board/card work.

## Definition Of Done

A non-trivial task is done when:

1. Its issue scope and acceptance criteria are satisfied.
2. Code follows [conventions](conventions.md) and package boundaries.
3. Tests cover behavior at the lowest useful layer plus relevant failure paths.
4. `pnpm verify` passes; `pnpm build` passes for package/UI/backend work.
5. UI behavior is checked on desktop and mobile; critical journeys use Playwright.
6. Architecture, flow, API, environment, or workflow changes update their owner docs.
7. A PR to `main` explains impact and verification, CI passes, and GitHub performs merge.

## Working Model

This project adopts useful CCEC practices: issue traceability, explicit definition of
done, layered testing guidance, documentation ownership, and complete PR delivery. It
does not copy CCEC's `develop`/staging strategy, deployment ceremony, Prisma guidance, or
multi-dashboard governance because this is a personal, local-first SQLite playground
with one permanent branch.
