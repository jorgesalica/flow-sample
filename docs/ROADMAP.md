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
- Runtime environment ownership is explicit and injected.
- Architecture contracts enforce key package and layering rules.
- Shared UI primitives and semantic theme tokens have their first production users.
- CI builds the monorepo and runs lint, type checks, Svelte checks, and coverage.
- Short-lived branches and PRs to `main` are the delivery contract.

Shared music database ownership is neutral in `@flows/music`; Spotify and Lyrics no
longer import each other's internals.

## Execution Queue

1. **UI design system
   ([#24](https://github.com/jorgesalica/flow-sample/issues/24))**: migrate remaining
   flows in small slices and complete accessibility/responsive coverage.
2. **Board v1 ([#42](https://github.com/jorgesalica/flow-sample/issues/42))**: accessible
   reorder, collapse, size preferences, and versioned local persistence.
3. **Board card contracts
   ([#43](https://github.com/jorgesalica/flow-sample/issues/43))**: typed summaries,
   expansion, and async states without flow-specific renderer branches.
4. **Named boards ([#44](https://github.com/jorgesalica/flow-sample/issues/44))**:
   repository-backed persistence, API, loader integration, and local migration.

Relationships and graph edges get a separate issue only after the board and card
contracts are proven. A DOM/CSS board is the default; an HTML canvas or graph library
requires an interaction-driven spike first.

## Deferred Epics

- [#23 LLM depth](https://github.com/jorgesalica/flow-sample/issues/23): prompt depth,
  contextual analysis, singing coach, and multi-agent orchestration.
- [#27 Music trio](https://github.com/jorgesalica/flow-sample/issues/27): playlists,
  song viewer, karaoke, and richer annotations.

They remain intentionally outside the current execution queue and are not prerequisites
for Board v1.

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
