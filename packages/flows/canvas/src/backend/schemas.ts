import { z } from 'zod';

export const meaningAnnotationSchema = z.object({
    tokenIds: z.array(z.string()).optional().describe('List of token IDs this meaning applies to. Use this for phrases.'),
    tokenId: z.string().optional().describe('Fallback: single token ID if it only applies to one word.'),
    layerId: z.literal('meaning'),
    label: z.string().describe('Short label for the meaning (e.g. Metaphor, Reference, Theme)'),
    detail: z.string().describe('Detailed explanation of the textual meaning context for this specific phrase'),
    context: z.string().describe('The broad theme this relates to'),
});

export const textAnnotationSchema = z.discriminatedUnion('layerId', [
    meaningAnnotationSchema,
]);

export const textAnalysisSchema = z.object({
    annotations: z.array(textAnnotationSchema).describe('List of annotations'),
    meta: z.object({
        theme: z.string().nullable().describe('Main theme of the text'),
        tone: z.string().nullable().describe('Emotional tone of the text'),
        summary: z.string().nullable().describe('One sentence summary'),
    }).describe('Overall metadata derived from the analysis'),
});

export type TextAnalysisResult = z.infer<typeof textAnalysisSchema>;
