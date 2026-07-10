# @flows/core

Shared infrastructure for the Flow monorepo.

## What's Inside

| Module | Import | Description |
| ------ | ------ | ----------- |
| Logger | `@flows/core/logger` | Pre-configured [Pino](https://getpino.io/) logger |
| Cache | `@flows/core/cache` | In-memory `SimpleCache` with TTL |
| Database | `@flows/core/db` | SQLite via `better-sqlite3` |
| LLM | `@flows/core/llm` | Multi-provider LLM client |

## LLM Module

Unified interface for 5 LLM providers with a model catalog, tier system, and free-provider rotation.

### Providers

| Provider | Pricing | Env Var | Highlights |
| -------- | ------- | ------- | ---------- |
| **Gemini** | paid | `GEMINI_API_KEY` | Google AI Studio / Vertex. Frontier models. |
| **Groq** | free | `GROQ_API_KEY` | Ultra-fast LPU inference. |
| **OpenRouter** | free | `OPENROUTER_API_KEY` | Aggregator, 24+ free models. |
| **Cerebras** | free | `CEREBRAS_API_KEY` | 1M tokens/day, fast inference. |
| **Mistral** | free | `MISTRAL_API_KEY` | 4M tokens/month experiment tier. |

### Model Tiers

Each model in the catalog has a `tier` and `pricing`:

- **`very_high`** — Frontier (Gemini 3.1 Pro, GPT-5, etc.)
- **`high`** — Near-frontier (Llama 3.3 70B, Qwen 235B, Mistral Large)
- **`medium`** — Solid generalist (Qwen 32B, Codestral, Llama 4 Scout)
- **`low`** — Fast & lightweight (Llama 3.1 8B, Gemma 4B, Mistral Nemo)

### Usage

```typescript
import { createLLMClientFromEnv } from '@flows/core';

// The named composition factory reads LLM_PROVIDER, LLM_MODEL, and provider API keys.
const client = createLLMClientFromEnv();
const response = await client.generate({
    messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.content);   // "Hi there!"
console.log(response.provider);  // "gemini"
console.log(response.model);     // "gemini-2.5-flash"
```

**Direct mode** — target a specific provider:

```typescript
import { LLMClient } from '@flows/core';

const client = new LLMClient('groq', groqApiKey, 'llama-3.3-70b-versatile');
```

**Rotation mode** — round-robin across free providers (auto-fallback on 429):

```typescript
const client = createLLMClientFromEnv({
    LLM_PROVIDER: 'rotation',
    GROQ_API_KEY: groqApiKey,
    OPENROUTER_API_KEY: openRouterApiKey,
});
```

### File Structure

```
src/llm/
├── llm-client.ts           # LLMClient class
├── index.ts                # Barrel + createLLMClient()
└── providers/
    ├── types.ts            # LLMMessage, ModelInfo, ModelTier, etc.
    ├── base-provider.ts    # Abstract BaseLLMProvider
    ├── gemini/             # @google/genai SDK
    ├── groq/               # OpenAI-compatible (fetch)
    ├── openrouter/         # OpenAI-compatible (fetch)
    ├── cerebras/           # OpenAI-compatible (fetch)
    └── mistral/            # OpenAI-compatible (fetch)
```

### Getting API Keys

See [docs/flows/llm/api-keys.md](../../docs/flows/llm/api-keys.md) for step-by-step guides.

## Quick Start

```typescript
import { logger, createLLMClient, SimpleCache } from '@flows/core';

const log = logger.child({ module: 'MyFlow' });
const llm = createLLMClient();
const cache = new SimpleCache(5 * 60 * 1000); // 5 min TTL (constructor takes milliseconds)
```
