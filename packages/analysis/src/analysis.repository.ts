import { createDatabase } from '@flows/core';
import type { CanvasAnalysis, CanvasSourceType } from '@flows/shared';
import type Database from 'better-sqlite3';

const ANALYSIS_DATABASE_NAME = 'canvas.db';

interface AnalysisRow {
  id: string;
  source_id: string;
  source_type: CanvasSourceType;
  source_text_hash: string;
  token_ast: string;
  annotations: string;
  layers: string;
  meta: string | null;
  model_used: string;
  provider_used: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRepository {
  save(analysis: CanvasAnalysis): void;
  findBySourceId(sourceId: string): CanvasAnalysis | null;
  deleteBySourceId(sourceId: string): void;
  listBySourceType(sourceType: CanvasSourceType): CanvasAnalysis[];
}

export function createAnalysisDatabase(dataDir?: string): Database.Database {
  const db = createDatabase(ANALYSIS_DATABASE_NAME, dataDir);
  initializeAnalysisDatabase(db);
  return db;
}

export function initializeAnalysisDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS canvas_analyses (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL UNIQUE,
      source_type TEXT NOT NULL DEFAULT 'track',
      source_text_hash TEXT NOT NULL,
      token_ast TEXT NOT NULL,
      annotations TEXT NOT NULL,
      layers TEXT NOT NULL,
      meta TEXT,
      model_used TEXT NOT NULL,
      provider_used TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_canvas_source
      ON canvas_analyses(source_id);
  `);
}

export class SQLiteAnalysisRepository implements AnalysisRepository {
  constructor(private readonly db: Database.Database) {}

  save(analysis: CanvasAnalysis): void {
    this.db
      .prepare(
        `
        INSERT INTO canvas_analyses
          (id, source_id, source_type, source_text_hash, token_ast, annotations, layers, meta, model_used, provider_used, created_at, updated_at)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
          source_text_hash = excluded.source_text_hash,
          token_ast = excluded.token_ast,
          annotations = excluded.annotations,
          layers = excluded.layers,
          meta = excluded.meta,
          model_used = excluded.model_used,
          provider_used = excluded.provider_used,
          updated_at = excluded.updated_at
      `,
      )
      .run(
        analysis.id,
        analysis.sourceId,
        analysis.sourceType,
        analysis.sourceTextHash,
        JSON.stringify(analysis.tokenAst),
        JSON.stringify(analysis.annotations),
        JSON.stringify(analysis.layers),
        analysis.meta ? JSON.stringify(analysis.meta) : null,
        analysis.modelUsed,
        analysis.providerUsed,
        analysis.createdAt,
        analysis.updatedAt,
      );
  }

  findBySourceId(sourceId: string): CanvasAnalysis | null {
    const row = this.db
      .prepare('SELECT * FROM canvas_analyses WHERE source_id = ?')
      .get(sourceId) as AnalysisRow | undefined;

    return row ? hydrateAnalysis(row) : null;
  }

  deleteBySourceId(sourceId: string): void {
    this.db.prepare('DELETE FROM canvas_analyses WHERE source_id = ?').run(sourceId);
  }

  listBySourceType(sourceType: CanvasSourceType): CanvasAnalysis[] {
    const rows = this.db
      .prepare('SELECT * FROM canvas_analyses WHERE source_type = ? ORDER BY created_at DESC')
      .all(sourceType) as AnalysisRow[];

    return rows.map(hydrateAnalysis);
  }
}

export function createAnalysisRepository(
  database: Database.Database = createAnalysisDatabase(),
): AnalysisRepository {
  return new SQLiteAnalysisRepository(database);
}

function hydrateAnalysis(row: AnalysisRow): CanvasAnalysis {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    sourceTextHash: row.source_text_hash,
    tokenAst: JSON.parse(row.token_ast),
    annotations: JSON.parse(row.annotations),
    layers: JSON.parse(row.layers),
    meta: row.meta ? JSON.parse(row.meta) : undefined,
    modelUsed: row.model_used,
    providerUsed: row.provider_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
