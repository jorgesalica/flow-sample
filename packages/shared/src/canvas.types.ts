/**
 * Canvas Core Types
 * Generic token and annotation system.
 * Independent of any specific domain (music, poetry, code, etc).
 */

// ── Tokens & AST ──────────────────────────────────────────────

export interface Token {
  id: string; // unique: "t_001"
  text: string; // the word: "soñarla"
}

export interface Section {
  id: string; // unique: "s_001"
  type: string; // "Verse", "Chorus", "Paragraph", etc.
  lines: Token[][]; // array of lines, each line = array of tokens
}

export interface TokenAST {
  sections: Section[];
  totalTokens: number;
}

// ── Annotations ───────────────────────────────────────────────

export interface Annotation {
  tokenId: string;
  layerId: string; // which layer this belongs to: "chords", "vocal", etc.
  label: string; // short display: "Am", "belt"
  detail: string; // long explanation for tooltip
}

export interface AnnotationLayer {
  id: string; // "chords", "vocal", "production"
  name: string; // "Chords", "Vocal Technique"
  icon: string; // "🎸", "🎤", "🎛️"
  color: string; // CSS color for this layer
}

// ── Persistence & Source ──────────────────────────────────────

export type CanvasSourceType = 'track' | 'user_text';

/** The input to the Canvas — decoupled from any specific flow. */
export interface CanvasSource {
  sourceId: string; // track ID, or user-generated ID
  sourceType: CanvasSourceType;
  text: string; // the raw text to tokenize
  title?: string; // display title
  author?: string; // display author/artist
  imageUrl?: string; // optional cover/image
}

/** The cached result of a canvas analysis. */
export interface CanvasAnalysis {
  id: string;
  sourceId: string;
  sourceType: CanvasSourceType;
  sourceTextHash: string; // detect if source text changed
  tokenAst: TokenAST;
  annotations: Annotation[];
  layers: AnnotationLayer[];
  meta?: Record<string, unknown>; // flexible: songMeta, or anything
  modelUsed: string;
  providerUsed: string;
  createdAt: string;
  updatedAt: string;
}
