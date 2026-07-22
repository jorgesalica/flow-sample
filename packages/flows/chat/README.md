# @flows/chat

Provider-neutral conversational flow with SQLite history, direct model selection,
free-provider rotation, and SSE streaming.

## Ownership

```text
domain/ports.ts              repository contract
domain/conversation.ts       deterministic title derivation
backend/database.ts          chat.db schema, SQL, and hydration
backend/services/            conversation and LLM orchestration
backend/schemas.ts           TypeBox request/response contracts
backend/routes.ts            HTTP/SSE validation and error mapping
```

`ChatService` uses the model catalog and LLM clients from `@flows/core`. Cross-wire chat
DTOs and stream event constants live in `@flows/shared`. Importing the package does not
open a database; the default route composition creates `chat.db` only when
`createChatRoutes()` is called.

## API

| Method   | Path                          | Purpose                                       |
| -------- | ----------------------------- | --------------------------------------------- |
| `GET`    | `/api/chat/models`            | Provider/model catalog                        |
| `GET`    | `/api/chat/conversations`     | Conversation summaries                        |
| `GET`    | `/api/chat/conversations/:id` | Ordered messages or `404`                     |
| `DELETE` | `/api/chat/conversations/:id` | Delete an existing conversation               |
| `POST`   | `/api/chat/message`           | Persist user and completed assistant messages |
| `POST`   | `/api/chat/message/stream`    | Stream typed user/delta/done/error SSE events |

Specific mode requires a concrete catalog model ID. Rotation mode tries configured free
providers according to the shared LLM policy. Provider failures are logged server-side
and exposed as sanitized `503` responses or typed stream errors.

## Configuration And Verification

Chat has no flow-specific environment variables. Configure `LLM_PROVIDER`, optional
`LLM_MODEL`, and provider API keys in the root `.env`; see
[LLM API keys](../../../docs/flows/llm/api-keys.md).

```bash
pnpm --filter @flows/chat typecheck
pnpm --filter @flows/chat test
pnpm --filter @flows/chat test:coverage
```
