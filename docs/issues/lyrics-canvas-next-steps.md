# Lyrics Canvas Follow-up Decisions

This historical tracker records the disposition of the original Canvas follow-ups.
Current execution work is owned by `docs/ROADMAP.md` and GitHub issues.

## Resolved

- Refresh routing, contextual phrase highlights, and annotation overlap were fixed in
  the original Lyrics Canvas delivery.
- Tokenizer domain coupling was resolved by #69: Core emits generic numbered sections
  and Lyrics owns music-section classification.
- Prompt structural-ID ambiguity was resolved by #69: both analyzers use the shared Core
  formatter and filter generated token references against the source AST.

## Deferred Deliberately

- **Analysis versioning:** overwrites remain the current contract. Add history only with
  a product requirement for comparison, rollback, or provenance views.
- **Annotation indexing:** the persisted flat array remains adequate. Introduce an index
  only after profiling demonstrates a rendering or query bottleneck.

See [Canvas and Lyrics Architecture](../flows/lyrics-canvas/architecture.md) for the
current boundaries and runtime contract.
