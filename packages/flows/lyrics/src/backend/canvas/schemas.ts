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

export const meaningAnnotationSchema = z.object({
  tokenIds: z
    .array(z.string())
    .optional()
    .describe('List of token IDs this meaning applies to. Use this for phrases.'),
  tokenId: z
    .string()
    .optional()
    .describe('Fallback: single token ID if it only applies to one word.'),
  layerId: z.literal('meaning'),
  label: z.string().describe('Short label for the meaning (e.g. Metaphor, Reference, Theme)'),
  detail: z
    .string()
    .describe('Detailed explanation of the lyrical meaning context for this specific phrase'),
  context: z.string().describe('The broad theme this relates to'),
});

export const musicAnnotationSchema = z.discriminatedUnion('layerId', [
  chordAnnotationSchema,
  vocalAnnotationSchema,
  productionAnnotationSchema,
  meaningAnnotationSchema,
]);

export const musicalAnalysisSchema = z.object({
  annotations: z.array(musicAnnotationSchema).describe('List of musical annotations'),
  meta: z
    .object({
      key: z.string().nullable(),
      bpm: z.number().nullable(),
      mood: z.string().nullable(),
    })
    .describe('Overall song metadata derived from the analysis'),
});

export type MusicalAnalysisResult = z.infer<typeof musicalAnalysisSchema>;
