import crypto from 'crypto';
import { tokenize } from '@flows/core';
import type { Annotation, CanvasAnalysis, TokenAST } from '@flows/shared';
import type { CanvasRepository } from '../domain/ports';

const GENERIC_CANVAS_LAYERS = [
  { id: 'meaning', name: 'Meaning', icon: '💡', color: '#22d3ee' },
];

export interface CanvasCreateInput {
  text: string;
  title?: string;
  author?: string;
}

export interface CanvasAnalyzerResult {
  annotations: Annotation[];
  meta: Record<string, unknown>;
  modelUsed: string;
  providerUsed: string;
}

export type CanvasAnalyzer = (
  ast: TokenAST,
  title?: string,
  author?: string,
) => Promise<CanvasAnalyzerResult>;

export interface CanvasApplication {
  list(): CanvasAnalysis[];
  get(sourceId: string): CanvasAnalysis | null;
  create(input: CanvasCreateInput): Promise<CanvasAnalysis>;
  delete(sourceId: string): boolean;
}

export interface CanvasServiceOptions {
  now?: () => Date;
  randomUUID?: () => string;
}

export class CanvasService implements CanvasApplication {
  private readonly now: () => Date;
  private readonly randomUUID: () => string;

  constructor(
    private readonly repository: CanvasRepository,
    private readonly analyzer: CanvasAnalyzer,
    options: CanvasServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
  }

  list(): CanvasAnalysis[] {
    return this.repository.listBySourceType('user_text');
  }

  get(sourceId: string): CanvasAnalysis | null {
    return this.repository.findBySourceId(sourceId);
  }

  async create(input: CanvasCreateInput): Promise<CanvasAnalysis> {
    const sourceId = `usr_${this.randomUUID()}`;
    const tokenAst = tokenize(input.text);
    const result = await this.analyzer(tokenAst, input.title, input.author);
    const timestamp = this.now().toISOString();

    const analysis: CanvasAnalysis = {
      id: `ca_${this.randomUUID()}`,
      sourceId,
      sourceType: 'user_text',
      sourceTextHash: hashText(input.text),
      tokenAst,
      annotations: result.annotations,
      layers: [...GENERIC_CANVAS_LAYERS],
      meta: {
        title: input.title || 'Untitled',
        author: input.author || 'User',
        ...result.meta,
      },
      modelUsed: result.modelUsed,
      providerUsed: result.providerUsed,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.repository.save(analysis);
    return analysis;
  }

  delete(sourceId: string): boolean {
    if (!this.repository.findBySourceId(sourceId)) {
      return false;
    }

    this.repository.deleteBySourceId(sourceId);
    return true;
  }
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
