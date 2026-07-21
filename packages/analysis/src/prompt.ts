import type { Annotation, TokenAST } from '@flows/shared';

/**
 * Format tokenized text for an LLM without exposing structural IDs as
 * annotatable content. Lines and blank section boundaries are preserved.
 */
export function formatTokenAstForPrompt(ast: TokenAST): string {
    return ast.sections
        .map((section) =>
            section.lines
                .map((line) => line.map((token) => `${token.text}[${token.id}]`).join(' '))
                .join('\n'),
        )
        .filter((section) => section.length > 0)
        .join('\n\n');
}

/** Keep only annotations that reference tokens present in the source AST. */
export function filterAnnotationsForAst(
    ast: TokenAST,
    annotations: Annotation[],
): Annotation[] {
    const tokenIds = new Set(
        ast.sections.flatMap((section) =>
            section.lines.flatMap((line) => line.map((token) => token.id)),
        ),
    );

    return annotations.filter((annotation) => tokenIds.has(annotation.tokenId));
}
