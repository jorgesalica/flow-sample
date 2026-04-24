# Lyrics Canvas: Technical Architecture

> Nodos técnicos, flujo de datos, y estructura de implementación.
> Updated: reflects three-pillar separation with Canvas as core infrastructure.

---

## Three Pillars

```mermaid
flowchart TD
    subgraph PILLAR_1 ["Pillar 1: Structured Intelligence"]
        direction TB
        P1A["generateObject&lt;T&gt;()"]
        P1B["Zod → JSON Schema"]
        P1C["Provider-agnostic"]
    end

    subgraph PILLAR_2 ["Pillar 2: Canvas Core"]
        direction TB
        P2A["Tokenizer<br/>(text → token AST)"]
        P2B["Canvas Repository<br/>(canvas.db CRUD)"]
        P2C["Generic types<br/>(Token, Section, Annotation)"]
    end

    subgraph PILLAR_3 ["Pillar 3: Canvas Renderer"]
        direction TB
        P3A["TokenRenderer"]
        P3B["LayerToggle"]
        P3C["TokenTooltip"]
    end

    subgraph DOMAIN ["Domain: Musical Analysis"]
        direction TB
        D1["Music analyzer<br/>(prompts + schemas)"]
        D2["Lyrics adapter<br/>(Track → CanvasSource)"]
    end

    PILLAR_1 --- DOMAIN
    PILLAR_2 --- DOMAIN
    DOMAIN --- PILLAR_3

    style PILLAR_1 fill:#1a1a2e,stroke:#e94560,color:#fff
    style PILLAR_2 fill:#1a1a2e,stroke:#0f3460,color:#fff
    style PILLAR_3 fill:#1a1a2e,stroke:#16213e,color:#fff
    style DOMAIN fill:#2d1b69,stroke:#a855f7,color:#fff
```

### Where each lives

| Pillar | Package | Reusable for |
| ------ | ------- | ------------ |
| **Structured Intelligence** | `@flows/core/llm` | Any flow needing typed JSON from LLM |
| **Canvas Core** | `@flows/core/canvas` | Any tokenized text analysis |
| **Canvas Renderer** | `@flows/ui/components/canvas` | Any annotated text UI |
| **Musical Domain** | `@flows/lyrics/canvas` | Lyrics-specific musical analysis |

---

## System Nodes

```mermaid
flowchart TD
    subgraph UI_SHARED ["Shared UI Components"]
        TOKEN_RENDERER["TokenRenderer.svelte"]
        LAYER_TOGGLE["LayerToggle.svelte"]
        TOOLTIP["TokenTooltip.svelte"]
    end

    subgraph UI_LYRICS ["Lyrics Flow UI"]
        CANVAS_PAGE["LyricsCanvas.svelte<br/>Full-page view"]
        API_CLIENT["canvas-api.ts"]
    end

    subgraph LYRICS_BACKEND ["Lyrics Flow Backend"]
        CANVAS_ROUTES["canvas.routes.ts"]
        MUSIC_ANALYZER["music-analyzer.ts<br/>Prompts + Zod schemas"]
    end

    subgraph CORE_CANVAS ["@flows/core/canvas"]
        TOKENIZER["tokenizer.ts"]
        CANVAS_REPO["canvas.repository.ts"]
    end

    subgraph CORE_LLM ["@flows/core/llm"]
        LLM_CLIENT["generateObject&lt;T&gt;()"]
    end

    subgraph DATA ["Persistence"]
        MUSIC_DB["music.db (existing)"]
        CANVAS_DB["canvas.db (new)"]
    end

    CANVAS_PAGE --> TOKEN_RENDERER
    CANVAS_PAGE --> LAYER_TOGGLE
    TOKEN_RENDERER --> TOOLTIP
    CANVAS_PAGE --> API_CLIENT

    API_CLIENT --> CANVAS_ROUTES
    CANVAS_ROUTES --> MUSIC_ANALYZER
    CANVAS_ROUTES --> TOKENIZER
    MUSIC_ANALYZER --> LLM_CLIENT
    CANVAS_ROUTES --> CANVAS_REPO

    CANVAS_ROUTES -->|"read lyrics"| MUSIC_DB
    CANVAS_REPO -->|"read/write"| CANVAS_DB
```

---

## Database

Two databases, two concerns:

```sql
-- canvas.db — Independent, owned by @flows/core/canvas
CREATE TABLE IF NOT EXISTS canvas_analyses (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL DEFAULT 'track',
    source_text_hash TEXT NOT NULL,
    token_ast TEXT NOT NULL,
    annotations TEXT NOT NULL,
    meta TEXT,
    model_used TEXT NOT NULL,
    provider_used TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canvas_source ON canvas_analyses(source_id);
```

---

## File Structure

```
packages/
├── core/src/
│   ├── llm/                              ──── PILLAR 1 (MODIFY)
│   │   ├── llm-client.ts                 ← add generateObject<T>()
│   │   └── providers/
│   │       ├── types.ts                  ← add StructuredOutputRequest
│   │       └── gemini/gemini-provider.ts ← implement responseJsonSchema
│   │
│   ├── canvas/                           ──── PILLAR 2 (NEW)
│   │   ├── tokenizer.ts                  ← text → token AST (generic)
│   │   ├── canvas.repository.ts          ← canvas.db CRUD (generic)
│   │   └── index.ts
│   │
│   └── index.ts                          ← export canvas module
│
├── shared/src/
│   ├── canvas.types.ts                   ← NEW: Token, Section, CanvasSource
│   ├── canvas-music.types.ts             ← NEW: ChordAnnotation, SongMeta
│   └── index.ts                          ← export canvas types
│
├── flows/lyrics/src/
│   └── backend/
│       ├── routes.ts                     ← mount canvas routes via .use()
│       └── canvas/                       ──── DOMAIN (NEW)
│           ├── canvas.routes.ts          ← Elysia routes
│           ├── music-analyzer.ts         ← prompts + Zod schema
│           └── index.ts
│
├── ui/src/lib/
│   ├── components/
│   │   └── canvas/                       ──── PILLAR 3 (NEW, SHARED)
│   │       ├── TokenRenderer.svelte
│   │       ├── LayerToggle.svelte
│   │       ├── TokenTooltip.svelte
│   │       └── index.ts
│   │
│   └── flows/lyrics/
│       ├── LyricsCanvas.svelte           ← NEW: page (uses shared components)
│       ├── canvas-api.ts                 ← NEW: API client
│       ├── LyricsFlow.svelte             ← MODIFY: add "Open Canvas" link
│       └── components/
│           └── LyricsModal.svelte        ← UNTOUCHED
│
└── docs/
    ├── flows/lyrics-canvas/              ← flow documentation
    └── high-level/                       ← design discussions
```

---

## Testing Strategy

| Pillar | What | How |
| ------ | ---- | --- |
| **Core: LLM** | `generateObject<T>()` returns typed, validated object | Unit test with mocked Gemini response |
| **Core: Canvas** | Tokenizer produces deterministic AST | Unit tests (Vitest) |
| **Core: Canvas** | Repository CRUD on canvas.db | Integration test |
| **Domain** | Music analyzer schemas validate correctly | Unit tests with fixtures |
| **UI** | TokenRenderer renders spans with data attributes | Component test |
