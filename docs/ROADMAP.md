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
- CI audits production dependencies, builds and import-smokes the monorepo, checks docs,
  architecture, sensitive data, formatting, lint, types, Svelte, tooling contracts, and
  conservative package coverage ratchets, then runs the full deterministic Playwright
  suite in a separate job.
- Backend workspaces share compiler defaults through one root config; UI API/loaders
  reject unvalidated double casts at the architecture gate.
- Short-lived branches and PRs to `main` are the delivery contract.

Shared music database ownership is neutral in `@flows/music`; Spotify and Lyrics no
longer import each other's internals.
Generic tokenization and analysis persistence are neutral in `@flows/analysis`; Canvas
and Lyrics own only their flow-specific orchestration.

## Execution Queue

The post-Board architecture audit produced this ordered closure queue. Each item has its
own acceptance criteria and ships through a separate PR:

1. [#82 compiled runtime packaging](https://github.com/jorgesalica/flow-sample/issues/82) - complete
2. [#83 dependency security and manifest hygiene](https://github.com/jorgesalica/flow-sample/issues/83) - complete
3. [#84 neutral analysis package](https://github.com/jorgesalica/flow-sample/issues/84) - complete
4. [#85 import-safe persistence composition](https://github.com/jorgesalica/flow-sample/issues/85) - complete
5. [#86 typed Lyrics Canvas transport](https://github.com/jorgesalica/flow-sample/issues/86) - complete
6. [#87 documentation and CI reconciliation](https://github.com/jorgesalica/flow-sample/issues/87) - complete

The closure queue is complete. It fixed executable artifacts and security first, then
package boundaries and typed transport, and finally reconciled repository-wide guidance
and gates. New work must enter through a scoped GitHub issue and be ordered here before
execution. The deferred epics below remain ideas, not an implicit queue.

Relationships and graph edges get a separate issue only after the named-board foundation
is proven and an interaction requirement is agreed.
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
4. `pnpm verify`, `pnpm build`, and `pnpm test:coverage` pass.
5. UI behavior is checked on desktop and mobile; critical journeys use Playwright, and
   the complete deterministic browser suite remains green in CI.
6. Architecture, flow, API, environment, or workflow changes update their owner docs.
7. A PR to `main` explains impact and verification, CI passes, and GitHub performs merge.

## Working Model

This project adopts useful CCEC practices: issue traceability, protected local refs,
explicit definition of done, layered and ratcheted testing, repository-wide formatting,
sensitive-data scanning, executable CI contracts, meaningful PR QA, documentation
ownership, and complete PR delivery.

It deliberately does not copy CCEC's `develop`/staging strategy, deployment ceremony,
Postgres/Prisma guidance, test sharding, or multi-dashboard governance. Flow Sample is a
personal, local-first SQLite application with one permanent branch and a smaller suite,
so every PR can run complete coverage and Playwright gates directly.
