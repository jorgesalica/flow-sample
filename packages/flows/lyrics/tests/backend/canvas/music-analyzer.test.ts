import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TokenAST } from '@flows/shared';
import type { MusicalAnalysisResult } from '../../../src/backend/canvas/schemas';

// Stub the LLM call at the edge: createRotation() returns a client whose
// generateObject resolves to a fixed structured result. The real analyzeLyrics
// expansion logic runs against it.
const generateObject = vi.fn();
const generateObjectWithMetadata = vi.fn(async (request: unknown, schema: unknown) => ({
    value: await generateObject(request, schema),
    response: {
        content: '{}',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        latencyMs: 1,
    },
}));

vi.mock('@flows/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@flows/core')>();
    const noop = () => {};
    const childLogger = { info: noop, error: noop, warn: noop, debug: noop };
    return {
        ...actual,
        LLMClient: {
            createRotation: vi.fn(() => ({ generateObjectWithMetadata })),
        },
        logger: { child: () => childLogger },
    };
});

// Import after the mock is registered.
const { analyzeLyrics } = await import('../../../src/backend/canvas/music-analyzer');

// ── Fixtures ──────────────────────────────────────────────────────────

function makeAst(): TokenAST {
    return {
        totalTokens: 4,
        sections: [
            {
                id: 's_001',
                type: 'Verse',
                lines: [
                    [
                        { id: 't_001', text: 'dark' },
                        { id: 't_002', text: 'water' },
                    ],
                    [
                        { id: 't_003', text: 'rising' },
                        { id: 't_004', text: 'slow' },
                    ],
                ],
            },
        ],
    };
}

const TRACK_TITLE = 'Deep Currents';
const ARTIST_NAME = 'Maria Perez';

describe('analyzeLyrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('passes non-meaning annotations through unchanged', async () => {
        const fixture: MusicalAnalysisResult = {
            annotations: [
                { tokenId: 't_001', layerId: 'chords', label: 'Am', detail: 'Melancholic', symbol: 'Am' },
                { tokenId: 't_002', layerId: 'vocal', label: 'Belt', detail: 'Powerful', technique: 'Belt' },
            ],
            meta: { key: 'A minor', bpm: 120, mood: 'Melancholic' },
        };
        generateObject.mockResolvedValue(fixture);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);

        expect(result.annotations).toHaveLength(2);
        expect(result.annotations[0]).toMatchObject({ tokenId: 't_001', layerId: 'chords', symbol: 'Am' });
        expect(result.annotations[1]).toMatchObject({ tokenId: 't_002', layerId: 'vocal', technique: 'Belt' });
        expect(result.meta).toEqual({ key: 'A minor', bpm: 120, mood: 'Melancholic' });
    });

    it('expands a meaning annotation with tokenIds into one per token', async () => {
        const fixture: MusicalAnalysisResult = {
            annotations: [
                {
                    tokenIds: ['t_001', 't_002'],
                    layerId: 'meaning',
                    label: 'Metaphor',
                    detail: "'dark water' represents depression",
                    context: 'Mental Health',
                },
            ],
            meta: { key: null, bpm: null, mood: null },
        };
        generateObject.mockResolvedValue(fixture);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);

        // 2 token ids → 2 individual annotations
        expect(result.annotations).toHaveLength(2);
        expect(result.annotations.map((a) => a.tokenId)).toEqual(['t_001', 't_002']);

        for (const ann of result.annotations) {
            expect(ann.layerId).toBe('meaning');
            expect(ann.label).toBe('Metaphor');
            expect(ann.context).toBe('Mental Health');
            // The collapsed tokenIds array must be stripped during expansion.
            expect(ann.tokenIds).toBeUndefined();
        }
    });

    it('uses the single fallback tokenId when a meaning has no tokenIds array', async () => {
        const fixture: MusicalAnalysisResult = {
            annotations: [
                {
                    tokenId: 't_003',
                    layerId: 'meaning',
                    label: 'Reference',
                    detail: 'A nod to a poem',
                    context: 'Literature',
                },
            ],
            meta: { key: null, bpm: null, mood: null },
        };
        generateObject.mockResolvedValue(fixture);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);

        expect(result.annotations).toHaveLength(1);
        expect(result.annotations[0].tokenId).toBe('t_003');
        expect(result.annotations[0].tokenIds).toBeUndefined();
    });

    it('drops a meaning annotation that has neither tokenIds nor tokenId', async () => {
        const fixture = {
            annotations: [
                { layerId: 'meaning', label: 'Theme', detail: 'Vague', context: 'Life' },
            ],
            meta: { key: null, bpm: null, mood: null },
        } as unknown as MusicalAnalysisResult;
        generateObject.mockResolvedValue(fixture);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);

        // No token ids → nothing to expand → annotation disappears.
        expect(result.annotations).toHaveLength(0);
    });

    it('mixes expanded meaning annotations with passed-through layers', async () => {
        const fixture: MusicalAnalysisResult = {
            annotations: [
                { tokenId: 't_001', layerId: 'chords', label: 'G', detail: 'Resolves', symbol: 'G' },
                {
                    tokenIds: ['t_002', 't_003', 't_004'],
                    layerId: 'meaning',
                    label: 'Imagery',
                    detail: 'Water imagery',
                    context: 'Nature',
                },
            ],
            meta: { key: 'C', bpm: 90, mood: 'Calm' },
        };
        generateObject.mockResolvedValue(fixture);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);

        // 1 chord (unchanged) + 3 expanded meaning = 4
        expect(result.annotations).toHaveLength(4);
        expect(result.annotations.filter((a) => a.layerId === 'meaning')).toHaveLength(3);
        expect(result.annotations.filter((a) => a.layerId === 'chords')).toHaveLength(1);
    });

    it('drops generated annotations that reference unknown token IDs', async () => {
        generateObject.mockResolvedValue({
            annotations: [
                { tokenId: 't_001', layerId: 'chords', label: 'Am', detail: 'Valid', symbol: 'Am' },
                { tokenId: 't_999', layerId: 'vocal', label: 'Belt', detail: 'Invalid', technique: 'Belt' },
            ],
            meta: { key: null, bpm: null, mood: null },
        } satisfies MusicalAnalysisResult);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);

        expect(result.annotations.map((annotation) => annotation.tokenId)).toEqual(['t_001']);
    });

    it('forwards the interpretation context and prompt to the LLM client', async () => {
        generateObject.mockResolvedValue({
            annotations: [],
            meta: { key: null, bpm: null, mood: null },
        } satisfies MusicalAnalysisResult);

        const result = await analyzeLyrics(
            makeAst(),
            TRACK_TITLE,
            ARTIST_NAME,
            'A song about resilience.',
        );

        expect(generateObject).toHaveBeenCalledOnce();
        const [request] = generateObject.mock.calls[0];
        const prompt = request.messages[0].content as string;
        // Tokenized lyrics are embedded with their token IDs.
        expect(prompt).toContain('dark[t_001]');
        expect(prompt).not.toContain('[Verse]');
        expect(prompt).not.toContain('s_001');
        expect(prompt).toContain(TRACK_TITLE);
        expect(prompt).toContain(ARTIST_NAME);
        // Interpretation is woven into the prompt.
        expect(prompt).toContain('A song about resilience.');
        // Deterministic generation params.
        expect(request.temperature).toBe(0.2);
        expect(request.maxTokens).toBe(4096);
        expect(result.providerUsed).toBe('groq');
        expect(result.modelUsed).toBe('llama-3.3-70b-versatile');
    });

    it('returns an empty annotations array when the LLM yields none', async () => {
        generateObject.mockResolvedValue({
            annotations: [],
            meta: { key: null, bpm: null, mood: null },
        } satisfies MusicalAnalysisResult);

        const result = await analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME);
        expect(result.annotations).toEqual([]);
    });

    it('propagates errors thrown by the LLM client', async () => {
        generateObject.mockRejectedValue(new Error('All providers failed'));

        await expect(analyzeLyrics(makeAst(), TRACK_TITLE, ARTIST_NAME)).rejects.toThrow(
            'All providers failed',
        );
    });
});
