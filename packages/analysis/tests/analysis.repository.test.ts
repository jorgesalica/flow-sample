import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { CanvasAnalysis } from '@flows/shared';

// In-memory DB shared between the mocked `createDatabase` and the tests.
const testDb = new Database(':memory:');

// Mock the db factory so the repository's getDb() receives an in-memory DB
// instead of opening a real data/canvas.db file.
vi.mock('@flows/core', () => ({
    createDatabase: () => testDb,
}));

// Import after the mock is registered so the repository binds to it.
const {
    saveAnalysis,
    findAnalysisBySourceId,
    deleteAnalysisBySourceId,
    deleteAnalysis,
    getAllAnalysesBySourceType,
} = await import('../src/analysis.repository');

// ── Fixtures ──────────────────────────────────────────────────────────

const SOURCE_TYPE_TRACK = 'track' as const;
const SOURCE_TYPE_USER_TEXT = 'user_text' as const;

function makeAnalysis(overrides: Partial<CanvasAnalysis> = {}): CanvasAnalysis {
    return {
        id: 'a_001',
        sourceId: 'src_1',
        sourceType: SOURCE_TYPE_TRACK,
        sourceTextHash: 'hash-1',
        tokenAst: {
            sections: [
                { id: 's_001', type: 'Verse', lines: [[{ id: 't_001', text: 'hola' }]] },
            ],
            totalTokens: 1,
        },
        annotations: [
            { tokenId: 't_001', layerId: 'meaning', label: 'greeting', detail: 'a salutation' },
        ],
        layers: [
            { id: 'meaning', name: 'Meaning', icon: 'M', color: '#fff' },
        ],
        meta: { language: 'es' },
        modelUsed: 'test-model',
        providerUsed: 'test-provider',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('canvas.repository', () => {
    beforeAll(() => {
        // First repository call lazily creates the schema (initSchema via getDb()).
        findAnalysisBySourceId('__schema_init__');
    });

    beforeEach(() => {
        testDb.exec('DELETE FROM canvas_analyses;');
    });

    describe('findAnalysisBySourceId', () => {
        it('returns null when no analysis exists for the source id', () => {
            expect(findAnalysisBySourceId('missing')).toBeNull();
        });

        it('returns the analysis once saved', () => {
            saveAnalysis(makeAnalysis());
            const found = findAnalysisBySourceId('src_1');
            expect(found).not.toBeNull();
            expect(found!.id).toBe('a_001');
            expect(found!.sourceId).toBe('src_1');
            expect(found!.sourceType).toBe(SOURCE_TYPE_TRACK);
        });
    });

    describe('saveAnalysis — JSON round-trip', () => {
        it('round-trips the tokenAst, annotations and layers structures', () => {
            const analysis = makeAnalysis();
            saveAnalysis(analysis);

            const found = findAnalysisBySourceId('src_1')!;
            expect(found.tokenAst).toEqual(analysis.tokenAst);
            expect(found.annotations).toEqual(analysis.annotations);
            expect(found.layers).toEqual(analysis.layers);
        });

        it('round-trips the optional meta object', () => {
            saveAnalysis(makeAnalysis({ meta: { language: 'es', mood: 'happy' } }));
            const found = findAnalysisBySourceId('src_1')!;
            expect(found.meta).toEqual({ language: 'es', mood: 'happy' });
        });

        it('stores meta as undefined when omitted', () => {
            saveAnalysis(makeAnalysis({ meta: undefined }));
            const found = findAnalysisBySourceId('src_1')!;
            expect(found.meta).toBeUndefined();
        });

        it('preserves all scalar metadata fields', () => {
            saveAnalysis(makeAnalysis());
            const found = findAnalysisBySourceId('src_1')!;
            expect(found.sourceTextHash).toBe('hash-1');
            expect(found.modelUsed).toBe('test-model');
            expect(found.providerUsed).toBe('test-provider');
            expect(found.createdAt).toBe('2026-01-01T00:00:00.000Z');
            expect(found.updatedAt).toBe('2026-01-01T00:00:00.000Z');
        });
    });

    describe('saveAnalysis — upsert on conflict (source_id)', () => {
        it('updates the existing row instead of inserting a duplicate', () => {
            saveAnalysis(makeAnalysis());
            saveAnalysis(
                makeAnalysis({
                    sourceTextHash: 'hash-2',
                    modelUsed: 'better-model',
                    providerUsed: 'better-provider',
                    updatedAt: '2026-02-02T00:00:00.000Z',
                    meta: { language: 'en' },
                }),
            );

            const count = (
                testDb
                    .prepare('SELECT COUNT(*) AS c FROM canvas_analyses WHERE source_id = ?')
                    .get('src_1') as { c: number }
            ).c;
            expect(count).toBe(1);

            const found = findAnalysisBySourceId('src_1')!;
            expect(found.sourceTextHash).toBe('hash-2');
            expect(found.modelUsed).toBe('better-model');
            expect(found.providerUsed).toBe('better-provider');
            expect(found.updatedAt).toBe('2026-02-02T00:00:00.000Z');
            expect(found.meta).toEqual({ language: 'en' });
        });

        it('does not overwrite created_at on conflict update', () => {
            saveAnalysis(makeAnalysis({ createdAt: '2020-01-01T00:00:00.000Z' }));
            saveAnalysis(makeAnalysis({ createdAt: '2099-12-31T00:00:00.000Z' }));

            const found = findAnalysisBySourceId('src_1')!;
            expect(found.createdAt).toBe('2020-01-01T00:00:00.000Z');
        });
    });

    describe('deleteAnalysisBySourceId', () => {
        it('removes a saved analysis', () => {
            saveAnalysis(makeAnalysis());
            deleteAnalysisBySourceId('src_1');
            expect(findAnalysisBySourceId('src_1')).toBeNull();
        });

        it('is a no-op when the source id does not exist', () => {
            expect(() => deleteAnalysisBySourceId('nope')).not.toThrow();
        });

        it('exposes deleteAnalysis as an alias', () => {
            expect(deleteAnalysis).toBe(deleteAnalysisBySourceId);
        });
    });

    describe('getAllAnalysesBySourceType', () => {
        it('returns an empty array when none match the source type', () => {
            expect(getAllAnalysesBySourceType(SOURCE_TYPE_USER_TEXT)).toEqual([]);
        });

        it('returns only analyses matching the requested source type', () => {
            saveAnalysis(makeAnalysis({ id: 'a_1', sourceId: 's_track', sourceType: SOURCE_TYPE_TRACK }));
            saveAnalysis(
                makeAnalysis({ id: 'a_2', sourceId: 's_user', sourceType: SOURCE_TYPE_USER_TEXT }),
            );

            const tracks = getAllAnalysesBySourceType(SOURCE_TYPE_TRACK);
            expect(tracks).toHaveLength(1);
            expect(tracks[0].sourceId).toBe('s_track');

            const userTexts = getAllAnalysesBySourceType(SOURCE_TYPE_USER_TEXT);
            expect(userTexts).toHaveLength(1);
            expect(userTexts[0].sourceId).toBe('s_user');
        });

        it('orders results by created_at descending', () => {
            saveAnalysis(
                makeAnalysis({
                    id: 'old',
                    sourceId: 's_old',
                    createdAt: '2026-01-01T00:00:00.000Z',
                }),
            );
            saveAnalysis(
                makeAnalysis({
                    id: 'new',
                    sourceId: 's_new',
                    createdAt: '2026-06-01T00:00:00.000Z',
                }),
            );

            const all = getAllAnalysesBySourceType(SOURCE_TYPE_TRACK);
            expect(all.map((a) => a.id)).toEqual(['new', 'old']);
        });

        it('hydrates JSON fields for every returned row', () => {
            saveAnalysis(makeAnalysis());
            const [row] = getAllAnalysesBySourceType(SOURCE_TYPE_TRACK);
            expect(row.tokenAst.totalTokens).toBe(1);
            expect(row.annotations).toHaveLength(1);
            expect(row.layers[0].id).toBe('meaning');
        });
    });
});
