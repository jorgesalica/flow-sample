/**
 * Canvas Music Types
 *
 * Musical annotation flavors that extend the generic Canvas system.
 * Knows about music/chords/vocals, but NOT about Spotify or Lyrics domains.
 */

import type { Annotation, AnnotationLayer } from './canvas.types';

// ── Predefined Layers ─────────────────────────────────────────

export const MUSIC_LAYERS: AnnotationLayer[] = [
  { id: 'chords', name: 'Chords', icon: '🎸', color: '#4ade80' },
  { id: 'vocal', name: 'Vocal', icon: '🎤', color: '#f59e0b' },
  { id: 'production', name: 'Production', icon: '🎛️', color: '#818cf8' },
];

// ── Specific Annotation Flavors ───────────────────────────────

export interface ChordAnnotation extends Annotation {
  layerId: 'chords';
  symbol: string; // "Am", "E", "B → E"
}

export interface VocalAnnotation extends Annotation {
  layerId: 'vocal';
  technique: string; // "belt", "falsetto", "soft onset"
}

export interface ProductionAnnotation extends Annotation {
  layerId: 'production';
  effect: string; // "delay throw", "dynamic break"
}

export type MusicAnnotation = ChordAnnotation | VocalAnnotation | ProductionAnnotation;

// ── Song Metadata ─────────────────────────────────────────────

export interface SongMeta {
  key: string | null; // "E major"
  bpm: number | null; // 130
  mood: string | null; // "euphoric, dreamy"
}
