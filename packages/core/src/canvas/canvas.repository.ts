/**
 * Canvas Repository
 *
 * Manages persistence of canvas analyses in a dedicated SQLite database (canvas.db).
 * Generic — stores any tokenized + annotated content, not specific to lyrics or music.
 */

import { createDatabase } from '../db';
import type { CanvasAnalysis } from '@flows/shared';
import type Database from 'better-sqlite3';

let db: Database.Database | null = null;

function getDb(): Database.Database {
    if (!db) {
        db = createDatabase('canvas.db');
        initSchema(db);
    }
    return db;
}

function initSchema(database: Database.Database): void {
    database.exec(`
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

/**
 * Save or update a canvas analysis.
 */
export function saveAnalysis(analysis: CanvasAnalysis): void {
    const db = getDb();
    const stmt = db.prepare(`
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
    `);

    stmt.run(
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

/**
 * Find a cached analysis by source ID.
 */
export function findAnalysisBySourceId(sourceId: string): CanvasAnalysis | null {
    const db = getDb();
    const row = db
        .prepare('SELECT * FROM canvas_analyses WHERE source_id = ?')
        .get(sourceId) as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
        id: row.id as string,
        sourceId: row.source_id as string,
        sourceType: row.source_type as string,
        sourceTextHash: row.source_text_hash as string,
        tokenAst: JSON.parse(row.token_ast as string),
        annotations: JSON.parse(row.annotations as string),
        layers: JSON.parse(row.layers as string),
        meta: row.meta ? JSON.parse(row.meta as string) : undefined,
        modelUsed: row.model_used as string,
        providerUsed: row.provider_used as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

/**
 * Delete a cached analysis by source ID.
 */
export function deleteAnalysisBySourceId(sourceId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM canvas_analyses WHERE source_id = ?').run(sourceId);
}

export const deleteAnalysis = deleteAnalysisBySourceId;

/**
 * Get all analyses by source type
 */
export function getAllAnalysesBySourceType(sourceType: string): CanvasAnalysis[] {
    const db = getDb();
    const rows = db
        .prepare('SELECT * FROM canvas_analyses WHERE source_type = ? ORDER BY created_at DESC')
        .all(sourceType) as Record<string, unknown>[];

    return rows.map(row => ({
        id: row.id as string,
        sourceId: row.source_id as string,
        sourceType: row.source_type as string,
        sourceTextHash: row.source_text_hash as string,
        tokenAst: JSON.parse(row.token_ast as string),
        annotations: JSON.parse(row.annotations as string),
        layers: JSON.parse(row.layers as string),
        meta: row.meta ? JSON.parse(row.meta as string) : undefined,
        modelUsed: row.model_used as string,
        providerUsed: row.provider_used as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }));
}
