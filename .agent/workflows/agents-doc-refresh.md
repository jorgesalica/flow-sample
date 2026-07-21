---
description: Update the owner documentation affected by a change
---

# Documentation Refresh Workflow

Start from [the documentation index](../../docs/README.md). Update facts at their owner:

| Change | Owner documentation |
| --- | --- |
| Product direction/execution | `docs/ROADMAP.md` and GitHub issues |
| Package/layer ownership | `docs/architecture/` |
| Flow behavior/API/config | `docs/flows/` and package README |
| UI primitives/tokens | `docs/design-system.md` |
| Testing policy/gates | `docs/testing/README.md` |
| Delivery/agent workflow | `AGENTS.md`, `docs/conventions.md`, `.agent/workflows/` |
| Environment variables | `.env.example` and relevant setup docs |
| Completed migration context | `docs/history/` |

Documentation changes ship in the same PR as the implementation. Do not maintain a second
completed-work checklist in `docs/bucket.md`; move completed implementation details to
history when they remain useful.

Run `pnpm check:docs`, then the broader gate required by the change.
