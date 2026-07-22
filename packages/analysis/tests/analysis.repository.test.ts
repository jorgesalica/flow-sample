import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { CanvasAnalysis } from '@flows/shared';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createAnalysisDatabase,
  createAnalysisRepository,
  initializeAnalysisDatabase,
  SQLiteAnalysisRepository,
} from '../src/analysis.repository';

const testDb = new Database(':memory:');
initializeAnalysisDatabase(testDb);
const repository = new SQLiteAnalysisRepository(testDb);

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
      sections: [{ id: 's_001', type: 'Verse', lines: [[{ id: 't_001', text: 'hola' }]] }],
      totalTokens: 1,
    },
    annotations: [
      { tokenId: 't_001', layerId: 'meaning', label: 'greeting', detail: 'a salutation' },
    ],
    layers: [{ id: 'meaning', name: 'Meaning', icon: 'M', color: '#fff' }],
    meta: { language: 'es' },
    modelUsed: 'test-model',
    providerUsed: 'test-provider',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('canvas.repository', () => {
  beforeEach(() => {
    testDb.exec('DELETE FROM canvas_analyses;');
  });

  describe('findAnalysisBySourceId', () => {
    it('returns null when no analysis exists for the source id', () => {
      expect(repository.findBySourceId('missing')).toBeNull();
    });

    it('returns the analysis once saved', () => {
      repository.save(makeAnalysis());
      const found = repository.findBySourceId('src_1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('a_001');
      expect(found!.sourceId).toBe('src_1');
      expect(found!.sourceType).toBe(SOURCE_TYPE_TRACK);
    });
  });

  describe('saveAnalysis — JSON round-trip', () => {
    it('round-trips the tokenAst, annotations and layers structures', () => {
      const analysis = makeAnalysis();
      repository.save(analysis);

      const found = repository.findBySourceId('src_1')!;
      expect(found.tokenAst).toEqual(analysis.tokenAst);
      expect(found.annotations).toEqual(analysis.annotations);
      expect(found.layers).toEqual(analysis.layers);
    });

    it('round-trips the optional meta object', () => {
      repository.save(makeAnalysis({ meta: { language: 'es', mood: 'happy' } }));
      const found = repository.findBySourceId('src_1')!;
      expect(found.meta).toEqual({ language: 'es', mood: 'happy' });
    });

    it('stores meta as undefined when omitted', () => {
      repository.save(makeAnalysis({ meta: undefined }));
      const found = repository.findBySourceId('src_1')!;
      expect(found.meta).toBeUndefined();
    });

    it('preserves all scalar metadata fields', () => {
      repository.save(makeAnalysis());
      const found = repository.findBySourceId('src_1')!;
      expect(found.sourceTextHash).toBe('hash-1');
      expect(found.modelUsed).toBe('test-model');
      expect(found.providerUsed).toBe('test-provider');
      expect(found.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(found.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('saveAnalysis — upsert on conflict (source_id)', () => {
    it('updates the existing row instead of inserting a duplicate', () => {
      repository.save(makeAnalysis());
      repository.save(
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

      const found = repository.findBySourceId('src_1')!;
      expect(found.sourceTextHash).toBe('hash-2');
      expect(found.modelUsed).toBe('better-model');
      expect(found.providerUsed).toBe('better-provider');
      expect(found.updatedAt).toBe('2026-02-02T00:00:00.000Z');
      expect(found.meta).toEqual({ language: 'en' });
    });

    it('does not overwrite created_at on conflict update', () => {
      repository.save(makeAnalysis({ createdAt: '2020-01-01T00:00:00.000Z' }));
      repository.save(makeAnalysis({ createdAt: '2099-12-31T00:00:00.000Z' }));

      const found = repository.findBySourceId('src_1')!;
      expect(found.createdAt).toBe('2020-01-01T00:00:00.000Z');
    });
  });

  describe('deleteAnalysisBySourceId', () => {
    it('removes a saved analysis', () => {
      repository.save(makeAnalysis());
      repository.deleteBySourceId('src_1');
      expect(repository.findBySourceId('src_1')).toBeNull();
    });

    it('is a no-op when the source id does not exist', () => {
      expect(() => repository.deleteBySourceId('nope')).not.toThrow();
    });
  });

  describe('getAllAnalysesBySourceType', () => {
    it('returns an empty array when none match the source type', () => {
      expect(repository.listBySourceType(SOURCE_TYPE_USER_TEXT)).toEqual([]);
    });

    it('returns only analyses matching the requested source type', () => {
      repository.save(
        makeAnalysis({ id: 'a_1', sourceId: 's_track', sourceType: SOURCE_TYPE_TRACK }),
      );
      repository.save(
        makeAnalysis({ id: 'a_2', sourceId: 's_user', sourceType: SOURCE_TYPE_USER_TEXT }),
      );

      const tracks = repository.listBySourceType(SOURCE_TYPE_TRACK);
      expect(tracks).toHaveLength(1);
      expect(tracks[0].sourceId).toBe('s_track');

      const userTexts = repository.listBySourceType(SOURCE_TYPE_USER_TEXT);
      expect(userTexts).toHaveLength(1);
      expect(userTexts[0].sourceId).toBe('s_user');
    });

    it('orders results by created_at descending', () => {
      repository.save(
        makeAnalysis({
          id: 'old',
          sourceId: 's_old',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      );
      repository.save(
        makeAnalysis({
          id: 'new',
          sourceId: 's_new',
          createdAt: '2026-06-01T00:00:00.000Z',
        }),
      );

      const all = repository.listBySourceType(SOURCE_TYPE_TRACK);
      expect(all.map((a) => a.id)).toEqual(['new', 'old']);
    });

    it('hydrates JSON fields for every returned row', () => {
      repository.save(makeAnalysis());
      const [row] = repository.listBySourceType(SOURCE_TYPE_TRACK);
      expect(row.tokenAst.totalTokens).toBe(1);
      expect(row.annotations).toHaveLength(1);
      expect(row.layers[0].id).toBe('meaning');
    });
  });
});

describe('analysis persistence factories', () => {
  it('creates and initializes a file-backed database in the requested directory', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'analysis-database-'));
    const database = createAnalysisDatabase(directory);

    try {
      const row = database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'canvas_analyses'")
        .get();
      expect(row).toBeDefined();
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('composes a repository from an explicit initialized database', () => {
    const database = new Database(':memory:');
    initializeAnalysisDatabase(database);
    const composed = createAnalysisRepository(database);

    composed.save(makeAnalysis());
    expect(composed.findBySourceId('src_1')?.id).toBe('a_001');
    database.close();
  });
});
