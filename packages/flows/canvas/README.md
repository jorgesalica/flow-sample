# @flows/canvas

Generic free-text analysis flow. It tokenizes user text, generates validated meaning
annotations through the shared LLM layer, and persists analyses through
`@flows/analysis`.

Lyrics Canvas is a separate music-specific orchestration inside `@flows/lyrics`; it
reuses the neutral analysis capabilities without making Canvas depend on Lyrics.

## Ownership

```text
domain/                     repository port, annotation expansion, typed errors
backend/text-analyzer.ts    generic prompt and structured LLM adapter
backend/service.ts          tokenization, orchestration, metadata, and hashing
backend/repository.ts       adapter over the neutral AnalysisRepository
backend/routes.ts           Elysia validation and sanitized HTTP errors
```

`createCanvasFlowApplication(repository)` composes the production service around an
injected Analysis repository. `createCanvasFlowRoutes(service)` is the HTTP boundary used
by the backend host and route tests. Public package imports are side-effect free.

## API

| Method   | Path                    | Purpose                                             |
| -------- | ----------------------- | --------------------------------------------------- |
| `GET`    | `/api/canvas`           | List user-text analyses                             |
| `GET`    | `/api/canvas/:sourceId` | Return an analysis or `404`                         |
| `POST`   | `/api/canvas`           | Analyze and persist text with optional title/author |
| `DELETE` | `/api/canvas/:sourceId` | Delete an analysis or return `404`                  |

Successful records include the deterministic token AST, validated annotations, generic
layers, source hash, and actual provider/model metadata. Provider failures return a
sanitized `503`.

## Configuration And Verification

Canvas has no flow-specific environment variables. It uses the root LLM provider
configuration and stores generic analyses in `canvas.db`.

```bash
pnpm --filter @flows/canvas typecheck
pnpm --filter @flows/canvas test
pnpm --filter @flows/canvas test:coverage
```

See [Canvas and Lyrics architecture](../../../docs/flows/lyrics-canvas/architecture.md)
for shared token, annotation-integrity, and persistence contracts.
