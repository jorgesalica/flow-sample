import { z } from 'zod';

export const chordAnnotationSchema = z.object({
    tokenId: z.string().describe('The ID of the token this annotation applies to (e.g. t_005)'),
    layerId: z.literal('chords'),
    label: z.string().describe('The chord symbol (e.g. Am, G, F#m)'),
    detail: z.string().describe('Explanation of the chord role in the progression'),
    symbol: z.string(),
});

export const vocalAnnotationSchema = z.object({
    tokenId: z.string(),
    layerId: z.literal('vocal'),
    label: z.string().describe('Short label for the vocal technique (e.g. Belt, Falsetto)'),
    detail: z.string().describe('Detailed explanation of how the vocalist performs this'),
    technique: z.string(),
});

export const productionAnnotationSchema = z.object({
    tokenId: z.string(),
    layerId: z.literal('production'),
    label: z.string(),
    detail: z.string(),
    effect: z.string(),
});

export const musicAnnotationSchema = z.discriminatedUnion('layerId', [
    chordAnnotationSchema,
    vocalAnnotationSchema,
    productionAnnotationSchema,
]);

export const musicalAnalysisSchema = z.object({
    annotations: z.array(musicAnnotationSchema).describe('List of musical annotations tied to specific tokens'),
    meta: z.object({
        key: z.string().nullable(),
        bpm: z.number().nullable(),
        mood: z.string().nullable(),
    }).describe('Overall song metadata derived from the analysis'),
});

export type MusicalAnalysisResult = z.infer<typeof musicalAnalysisSchema>;
