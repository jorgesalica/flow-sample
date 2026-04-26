# Issue: Lyrics Canvas - Next Steps & Polish

This issue tracks the pending refinements for the Lyrics Canvas flow.

## ~~1. Routing Bug (F5 Refresh)~~ ✅ FIXED
Stripped query params from hash before matching in `App.svelte`.

## ~~2. Contextual "Line" Highlights (Hover)~~ ✅ FIXED
- Meaning annotations are now **hover-only** (no floating badge). The text shows a dashed underline, and hovering any word in a phrase highlights ALL words that share the same meaning annotation (group-level highlight).
- Meaning label/detail moved entirely into the tooltip.

## ~~3. Persistent Overlap (Chords vs Vocals)~~ ✅ FIXED
- Replaced `position: absolute` with **flex column layout**. Each token is now a vertical flex container: `[top badges] → [text] → [bottom badges]`. Multiple chords or production tags stack cleanly without overlap.

---

## Open: Future Architecture Improvements

### A. Tokenizer Domain Coupling
The generic tokenizer (`packages/core/src/canvas/tokenizer.ts`) has music-specific `inferSectionType()` logic (Verse, Chorus, Bridge). This should be:
- **Tokenizer**: only outputs "Section 1", "Section 2"
- **Lyrics Flow post-processor**: applies domain-specific section type inference

### B. Prompt Optimization
`formatAstForPrompt()` sends structural tags like `[Verse]` along with token IDs. This sometimes confuses the LLM into trying to annotate non-existent tokens from the structural markers.

### C. Analysis Versioning
Currently, regenerating an analysis overwrites the previous one. A versioned approach would allow comparison between different model outputs.

### D. Annotation Index
Annotations are stored as a flat JSON array. For tracks with 100+ annotations, an indexed structure (e.g. `Record<tokenId, Annotation[]>`) in the DB would be more efficient.
