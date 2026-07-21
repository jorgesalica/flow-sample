# @flows/analysis

Neutral text-analysis capabilities shared by Canvas and Lyrics.

## Owns

- Deterministic text tokenization into the shared `TokenAST` contract.
- Prompt-safe AST formatting and annotation token-ID filtering.
- Generic `canvas.db` analysis persistence.

## Does Not Own

- LLM provider infrastructure, logging, caching, or database factories; those remain in
  `@flows/core`.
- Canvas or Lyrics orchestration, prompts, schemas, routes, and domain rules.
- Cross-wire DTO definitions, which remain in `@flows/shared`.

The package is an in-process workspace boundary, not a deployable service. Consumers use
the package root exports and must not import internal files.
