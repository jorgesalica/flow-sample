import { LLMClient, logger } from '@flows/core';
import type { TokenAST, Annotation } from '@flows/shared';
import { textAnalysisSchema, type TextAnalysisResult } from './schemas';
import { expandAnnotations } from '../domain/annotations';
import { CanvasAnalysisError } from '../domain/errors';

const log = logger.child({ module: 'CanvasTextAnalyzer' });

function formatAstForPrompt(ast: TokenAST): string {
    let output = '';
    for (const section of ast.sections) {
        output += `\n[${section.type}] (ID: ${section.id})\n`;
        for (const line of section.lines) {
            const lineTokens = line.map(t => `${t.text}[${t.id}]`).join(' ');
            output += `${lineTokens}\n`;
        }
    }
    return output.trim();
}

export async function analyzeText(ast: TokenAST, title?: string, author?: string): Promise<{ annotations: Annotation[]; meta: TextAnalysisResult['meta'] }> {
    const client = LLMClient.createRotation();
    const tokenizedText = formatAstForPrompt(ast);
    
    const identity = author ? `"${title}" by ${author}` : 'the following text';

    const prompt = `
You are an expert literary analyst and interpreter. Your task is to analyze ${identity} and provide textual annotations.

I am providing you the text where every word has a unique token ID attached to it, like this: word[t_001].
When you want to annotate a word with a thematic or contextual meaning, you MUST use the exact token ID provided.

Here is the tokenized text:
---
${tokenizedText}
---

Your task:
1. Provide MEANING annotations to highlight literary context, metaphors, historical references, or thematic focus on specific phrases. 
   - **DO NOT STATE THE OBVIOUS**. Do not just paraphrase the text. 
   - Connect the phrase to overarching themes, its deeper emotional context, or cultural references.
   - **CRITICAL RULE FOR MEANINGS**: If a meaning applies to an entire phrase or sentence, you MUST include ALL token IDs from that phrase in the \`tokenIds\` array. Do NOT just annotate the first word.
2. Provide an overall META analysis (theme, tone, summary).

IMPORTANT DENSITY RULE: Provide a dense, rich analysis identifying key moments in the text.

3. Return the exact JSON structure requested. Do not invent token IDs. Only use the IDs present in the text above.
`;

    log.info({ title, author }, 'Starting LLM text analysis');
    
    const startTime = Date.now();
    
    try {
        const result = await client.generateObject(
            {
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                maxTokens: 8192,
            },
            textAnalysisSchema
        );
        
        const expandedAnnotations = expandAnnotations(result.annotations);

        log.info({
            latencyMs: Date.now() - startTime,
            annotationsCount: expandedAnnotations.length
        }, 'LLM analysis completed successfully');

        return {
            ...result,
            annotations: expandedAnnotations
        };
    } catch (error) {
        log.error({ error, title }, 'Failed to generate text analysis');
        if (error instanceof CanvasAnalysisError) {
            throw error;
        }
        throw new CanvasAnalysisError(
            error instanceof Error ? error.message : 'Canvas text analysis failed',
        );
    }
}
