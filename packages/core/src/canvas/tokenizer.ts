/**
 * Canvas Tokenizer
 *
 * Converts plain text into a TokenAST (Abstract Syntax Tree).
 * Generic — no knowledge of music, lyrics, or any specific domain.
 *
 * Sections are detected by blank lines. Tokens are split by whitespace.
 * Each token and section gets a unique, deterministic ID.
 */

import type { Token, Section, TokenAST } from '@flows/shared';

/**
 * Tokenize plain text into a structured AST of sections, lines, and word tokens.
 *
 * @param text - Raw text to tokenize
 * @returns TokenAST with sections, lines, and uniquely identified tokens
 */
export function tokenize(text: string): TokenAST {
    const rawSections = text.split(/\n\s*\n/).filter((s) => s.trim().length > 0);
    const sections: Section[] = [];
    let tokenCounter = 0;
    let sectionCounter = 0;

    for (const rawSection of rawSections) {
        sectionCounter++;
        const sectionId = `s_${String(sectionCounter).padStart(3, '0')}`;
        const rawLines = rawSection.split('\n').filter((l) => l.trim().length > 0);
        const lines: Token[][] = [];

        for (const rawLine of rawLines) {
            const words = rawLine.trim().split(/\s+/).filter((w) => w.length > 0);
            const lineTokens: Token[] = [];

            for (const word of words) {
                tokenCounter++;
                const tokenId = `t_${String(tokenCounter).padStart(3, '0')}`;
                lineTokens.push({ id: tokenId, text: word });
            }

            if (lineTokens.length > 0) {
                lines.push(lineTokens);
            }
        }

        if (lines.length > 0) {
            sections.push({
                id: sectionId,
                type: inferSectionType(rawSection, sectionCounter),
                lines,
            });
        }
    }

    return {
        sections,
        totalTokens: tokenCounter,
    };
}

/**
 * Simple heuristic to infer section type.
 * Can be overridden by LLM annotations later.
 */
function inferSectionType(sectionText: string, index: number): string {
    const lower = sectionText.toLowerCase().trim();

    // Check for explicit section markers
    if (/^\[?(verse|estrofa)/i.test(lower)) return 'Verse';
    if (/^\[?(chorus|coro|estribillo)/i.test(lower)) return 'Chorus';
    if (/^\[?(bridge|puente)/i.test(lower)) return 'Bridge';
    if (/^\[?(pre[- ]?chorus)/i.test(lower)) return 'Pre-Chorus';
    if (/^\[?(outro|final)/i.test(lower)) return 'Outro';
    if (/^\[?(intro)/i.test(lower)) return 'Intro';

    // Default: first section is usually a verse
    return index === 1 ? 'Verse' : 'Section';
}
