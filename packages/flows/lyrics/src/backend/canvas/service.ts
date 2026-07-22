import crypto from 'crypto';
import { tokenize, type AnalysisRepository } from '@flows/analysis';
import { MUSIC_LAYERS, type CanvasAnalysis } from '@flows/shared';
import type { LyricsRepository } from '../../domain/ports';
import { classifyLyricsSections } from '../../domain/section-classifier';
import { analyzeLyrics } from './music-analyzer';
import type { LyricsCanvasRepository, LyricsCanvasTrack } from './repository';

const MEANING_LAYER = {
  id: 'meaning',
  name: 'Meaning',
  icon: 'Insight',
  color: '#22d3ee',
};

export interface LyricsCanvasSource {
  sourceId: string;
  sourceType: 'track';
  title: string;
  author: string;
  imageUrl: string | null;
}

export type LyricsCanvasLoadResult =
  | { kind: 'found'; analysis: CanvasAnalysis }
  | { kind: 'track_not_found' }
  | { kind: 'lyrics_missing' }
  | { kind: 'analysis_missing'; source: LyricsCanvasSource };

export type LyricsCanvasAnalyzeResult =
  | { kind: 'created'; analysis: CanvasAnalysis }
  | { kind: 'source_unavailable' };

export class LyricsCanvasService {
  constructor(
    private readonly canvasRepository: LyricsCanvasRepository,
    private readonly lyricsRepository: LyricsRepository,
    private readonly analysisRepository: AnalysisRepository,
  ) {}

  async load(trackId: string): Promise<LyricsCanvasLoadResult> {
    const cached = this.analysisRepository.findBySourceId(trackId);
    if (cached) {
      return { kind: 'found', analysis: cached };
    }

    const track = this.canvasRepository.findTrackDetails(trackId);
    if (!track) {
      return { kind: 'track_not_found' };
    }

    if (!track.plainLyrics) {
      return { kind: 'lyrics_missing' };
    }

    return {
      kind: 'analysis_missing',
      source: this.toCanvasSource(track),
    };
  }

  async analyze(trackId: string): Promise<LyricsCanvasAnalyzeResult> {
    const track = this.canvasRepository.findTrackDetails(trackId);
    if (!track?.plainLyrics) {
      return { kind: 'source_unavailable' };
    }

    const interpretation = await this.lyricsRepository.getInterpretation(trackId);
    const tokenAst = classifyLyricsSections(tokenize(track.plainLyrics));
    const analysisResult = await analyzeLyrics(tokenAst, track.title, track.artist, interpretation);
    const now = new Date().toISOString();

    const analysis: CanvasAnalysis = {
      id: `ca_${crypto.randomUUID()}`,
      sourceId: trackId,
      sourceType: 'track',
      sourceTextHash: hashText(track.plainLyrics),
      tokenAst,
      annotations: analysisResult.annotations,
      layers: [...MUSIC_LAYERS, MEANING_LAYER],
      meta: analysisResult.meta,
      modelUsed: analysisResult.modelUsed,
      providerUsed: analysisResult.providerUsed,
      createdAt: now,
      updatedAt: now,
    };

    this.analysisRepository.save(analysis);

    return { kind: 'created', analysis };
  }

  private toCanvasSource(track: LyricsCanvasTrack): LyricsCanvasSource {
    return {
      sourceId: track.id,
      sourceType: 'track',
      title: track.title,
      author: track.artist,
      imageUrl: track.imageUrl,
    };
  }
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
