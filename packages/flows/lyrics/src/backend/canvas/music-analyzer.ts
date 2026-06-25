import { LLMClient, logger } from '@flows/core';
import type { TokenAST, Annotation } from '@flows/shared';
import { musicalAnalysisSchema, type MusicalAnalysisResult } from './schemas';

const log = logger.child({ module: 'CanvasMusicAnalyzer' });

/**
 * Formats the TokenAST into a flat, readable string with token IDs.
 * This teaches the LLM which exact ID corresponds to which word.
 */
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

/**
 * Analyzes the lyrics using the LLM to generate musical annotations.
 */
export async function analyzeLyrics(
    ast: TokenAST, 
    trackTitle: string, 
    artistName: string, 
    interpretation?: string | null
): Promise<{ annotations: Annotation[]; meta: MusicalAnalysisResult['meta'] }> {
    const client = LLMClient.createRotation();
    
    const tokenizedLyrics = formatAstForPrompt(ast);
    
    const interpretationContext = interpretation 
        ? `\nOVERARCHING SONG MEANING:\n${interpretation}\n\n`
        : '';
    
    const prompt = `
You are an expert music producer and arranger. Your task is to analyze the lyrics of "${trackTitle}" by ${artistName} and provide musical annotations.
${interpretationContext}
I am providing you the lyrics where every word has a unique token ID attached to it, like this: word[t_001].
When you want to annotate a word with a chord change or vocal technique, you MUST use the exact token ID provided.

Here are the tokenized lyrics:
---
${tokenizedLyrics}
---

Your task:
1. Provide CHORD annotations where harmonic changes typically occur. Use standard notation (e.g. Am, G, F#m). (At least 15-20 chords per song)
2. Provide VOCAL annotations where the singer uses specific techniques (e.g. Belt, Falsetto, Vibrato). (At least 10-15 vocal techniques per song)
3. Provide MEANING annotations to highlight lyrical context, metaphors, historical references, or thematic focus on specific phrases. (At least 10-15 meaning annotations per song)
   - **DO NOT STATE THE OBVIOUS**. Do not just paraphrase the lyrics (e.g. if the lyric is "I am crazy", do not say "The singer is crazy"). 
   - Connect the phrase to the overarching song meaning, its deeper emotional context, or cultural references.
   - **CRITICAL RULE FOR MEANINGS**: If a meaning applies to an entire phrase or sentence, you MUST include ALL token IDs from that phrase in the \`tokenIds\` array. Do NOT just annotate the first word.
4. Provide an overall META analysis (key, bpm, mood).

IMPORTANT DENSITY RULE: You are analyzing at a word-by-word level. Do NOT be sparse. Provide a dense, rich analysis. It is perfectly fine to have multiple annotations (from different layers) on the exact same token, or annotations on adjacent tokens.

5. Return the exact JSON structure requested. Do not invent token IDs. Only use the IDs present in the text above.

EXAMPLE JSON OUTPUT:
\`\`\`json
{
  "annotations": [
    {
      "tokenId": "t_005",
      "layerId": "chords",
      "label": "Am",
      "detail": "Sets a melancholic tone",
      "symbol": "Am"
    },
    {
      "tokenId": "t_012",
      "layerId": "vocal",
      "label": "Falsetto",
      "detail": "Breathy voice to convey vulnerability",
      "technique": "Falsetto"
    },
    {
      "tokenIds": ["t_015", "t_016", "t_017"],
      "layerId": "meaning",
      "label": "Metaphor",
      "detail": "The 'dark water' represents the singer's struggle with depression.",
      "context": "Mental Health"
    }
  ],
  "meta": {
    "key": "A minor",
    "bpm": 120,
    "mood": "Melancholic"
  }
}
\`\`\`
`;

    log.info({ trackTitle, artistName }, 'Starting LLM musical analysis');
    
    const startTime = Date.now();
    
    try {
        const result = await client.generateObject(
            {
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2, // Low temperature for deterministic/factual analysis
                maxTokens: 8192,  // Ensure the model has enough tokens for high density output
            },
            musicalAnalysisSchema
        );
        
        // Expand meaning tokenIds arrays back into individual annotations
        const expandedAnnotations: any[] = [];
        
        for (const ann of result.annotations) {
            if (ann.layerId === 'meaning') {
                const tids = ann.tokenIds || (ann.tokenId ? [ann.tokenId] : []);
                for (const tid of tids) {
                    expandedAnnotations.push({
                        ...ann,
                        tokenIds: undefined,
                        tokenId: tid
                    });
                }
            } else {
                expandedAnnotations.push(ann);
            }
        }
        
        log.info({ 
            latencyMs: Date.now() - startTime,
            annotationsCount: expandedAnnotations.length
        }, 'LLM analysis completed successfully');
        
        return {
            ...result,
            annotations: expandedAnnotations
        };
    } catch (error) {
        log.error({ error, trackTitle }, 'Failed to generate musical analysis');
        throw error;
    }
}
