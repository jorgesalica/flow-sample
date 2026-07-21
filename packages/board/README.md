# @flows/board

Application-composition package for named board persistence. It is not a registered
flow or a separately deployed app.

## Ownership

- `domain/`: typed errors and persistence port.
- `backend/repository.ts`: `boards.db` schema, SQL, and hydration.
- `backend/service.ts`: default/active-board invariants and mutations.
- `backend/routes.ts`: Elysia HTTP validation and error mapping under `/api/boards`.

The package has no environment variables. The default composition uses `data/boards.db`;
tests inject an in-memory SQLite database.

The service guarantees one protected default board and always repairs an absent active
selection back to it. Names are case-insensitively unique; layout version, item count,
flow IDs, and sizes are validated before persistence.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/boards` | list boards and resolve the active board |
| `POST` | `/api/boards` | create and select a board |
| `PATCH` | `/api/boards/:id` | rename a board |
| `PUT` | `/api/boards/:id/layout` | replace ordered layout items |
| `POST` | `/api/boards/:id/select` | select the active board |
| `DELETE` | `/api/boards/:id` | delete a non-default board |

```bash
pnpm --filter @flows/board test
pnpm --filter @flows/board test:coverage
pnpm --filter @flows/board typecheck
```
