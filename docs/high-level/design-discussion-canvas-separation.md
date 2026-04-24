# Design Discussion: Three-Pillar Separation

> Conversation date: 2026-04-23
> Context: Lyrics Canvas spike — defining where code lives and why

---

## The Question

During the Lyrics Canvas spike analysis, we identified three independent "centers of mass" in the system. The question was: should the Canvas live inside the Lyrics Flow package, or should it be separated?

## The Analysis Pattern

We applied a simple filter to every piece of code:

> **"If I wanted to use this for something other than lyrics, would I need to import lyrics?"**

If yes → it belongs in the lyrics flow.
If no → it's infrastructure and belongs in core or shared.

### Results

| Component | Used for lyrics only? | Where it goes |
| --------- | -------------------- | ------------- |
| Tokenizer (text → token AST) | No — works on any text | `@flows/core/canvas` |
| Canvas repository (DB CRUD) | No — stores any analysis | `@flows/core/canvas` |
| Token, Section, CanvasSource types | No — generic | `@flows/shared` |
| TokenRenderer, LayerToggle, Tooltip | No — renders any tokens | `ui/components/canvas` (shared) |
| Musical Zod schemas (chords, vocal) | **Yes** — music-specific | `@flows/lyrics/canvas` |
| Music analyzer prompts | **Yes** — music-specific | `@flows/lyrics/canvas` |
| Lyrics → CanvasSource adapter | **Yes** — bridges lyrics to canvas | `@flows/lyrics/canvas` |
| LyricsCanvas.svelte page | **Yes** — lyrics-specific page | `ui/flows/lyrics` |

## The Principle

**Infrastructure vs. Feature:**
- Infrastructure (tokenizer, renderer, DB) goes in `core` or `shared` — like `llm`, `db`, `cache`
- Features (musical analysis, lyrics adapter) go in the flow package

This means adding a "Writing Canvas" or "Poetry Canvas" in the future requires:
- **Zero changes** to core, shared, or UI components
- **One new analyzer** with its own prompts and schemas
- **One new page** that consumes the shared components

## Data Coupling

Canvas consumes data from Spotify and Lyrics but doesn't extend or modify them:

| Data needed | Source | Access method | Coupling |
| ----------- | ------ | ------------- | -------- |
| `plainLyrics` | Lyrics table | Existing API `GET /api/lyrics/:trackId` | Read-only |
| `track.title` | Spotify tracks | Already in UI from dashboard | Read-only |
| `artist name` | Spotify track_artists | Already in UI from dashboard | Read-only |
| `imageUrl` | Spotify albums | Already in UI from dashboard | Read-only |
| `trackId` | Primary key | String reference | Read-only |

**No new columns, no new joins, no schema modifications.** Canvas only reads.

## Database Separation

The canvas analysis data lives in its own `canvas.db`, not in `music.db`:
- Can be wiped independently (re-analyze everything)
- Not coupled to Spotify's data lifecycle
- Future-proof for non-lyrics sources (user text, imports)

## Libraries Decision

| Need | Decision | Rationale |
| ---- | -------- | --------- |
| Structured LLM output | `zod-to-json-schema` (new dep) | Official Gemini docs recommend it. 1 small package |
| Schema validation | `zod` (already in project) | Already used by `@flows/chat` |
| Gemini JSON mode | `@google/genai` (already installed) | v1.39 supports `responseJsonSchema` natively |
| Text tokenization | Hand-written (~30 lines) | Regex split by whitespace + blank line sections. NLP libs are overkill |
| UI tooltips | Hand-written CSS | Absolute positioned div. No lib needed for PoC |

**Net new dependencies: 1** (`zod-to-json-schema`)
