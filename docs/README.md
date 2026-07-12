# Documentation

This index separates current guidance from history and exploratory proposals. When a
change makes a current document inaccurate, update that document in the same PR.

## Sources Of Truth

| Area | Owner document |
| --- | --- |
| Product direction and execution | [Roadmap](ROADMAP.md) and open GitHub issues |
| Engineering and delivery rules | [Conventions](conventions.md) |
| Agent operating context | [AGENTS.md](../AGENTS.md) |
| Package boundaries | [System map](architecture/system-map.md) |
| Backend layering | [Backend architecture](architecture/backend.md) |
| Frontend structure | [UI architecture](architecture/ui.md) |
| Testing policy | [Testing strategy](testing/README.md) |
| UI primitives and tokens | [Design system](design-system.md) |

## Domain And Flow Documentation

- [Spotify](flows/spotify/getting-started.md)
- [Lyrics](flows/lyrics/getting-started.md)
- [Lyrics Canvas](flows/lyrics-canvas/architecture.md)
- [Trading Bot](flows/trading-bot/README.md)
- [LLM API keys](flows/llm/api-keys.md)

Flow docs own intent, external dependencies, route/API behavior, configuration, and
flow-specific operational guidance. Package READMEs may provide a concise developer entry
point but should link to the owner document instead of duplicating it.

## Supporting Material

- [Architecture index](architecture/README.md) contains current and abstract maps.
- [Project history](history/README.md) records completed migrations and origins.
- [Refactor proposals](refactor-proposals/README.md) are exploratory or historical unless
  the roadmap explicitly promotes one into active work.
- [Project bucket](bucket.md) holds uncommitted ideas only; executable work belongs in a
  GitHub issue.

## Documentation Rules

1. Prefer one owner per fact and link to it from other documents.
2. Roadmap entries describe direction; GitHub issues hold executable acceptance criteria.
3. Historical documents must say they are historical and must not prescribe current code.
4. Never include credentials, personal data, or copied production payloads.
5. Run `pnpm check:docs` after moving or renaming Markdown files.
