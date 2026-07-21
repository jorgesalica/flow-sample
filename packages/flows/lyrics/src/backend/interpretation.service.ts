import { LLMClient } from '@flows/core';
import {
  LYRICS_INTERPRETATION_EVENT_TYPES,
  LYRICS_STATUSES,
  type LyricsInterpretationEvent,
  type TrackRepository,
} from '@flows/shared';
import { LyricsNotFoundError } from '../domain/errors';
import type { LyricsRepository } from '../domain/ports';

const LYRICS_INTERPRETATION_PROMPT =
  'You are a music analyst. Analyze the following song lyrics. ' +
  'Explain what the song is about, its themes, emotions, and any notable metaphors or references. ' +
  'Write in the same language as the lyrics. Be concise but insightful. ' +
  'Use Markdown formatting for structure.';

interface InterpretationRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

interface InterpretationProviderEvent {
  delta: string;
  done: boolean;
}

export interface LyricsInterpretationProvider {
  generateStream(request: InterpretationRequest): AsyncIterable<InterpretationProviderEvent>;
}

export type LyricsInterpretationProviderFactory = () => LyricsInterpretationProvider;

export interface LyricsInterpretationApplication {
  prepareStream(trackId: string): Promise<AsyncIterable<LyricsInterpretationEvent>>;
}

export class LyricsInterpretationService implements LyricsInterpretationApplication {
  constructor(
    private readonly lyricsRepository: LyricsRepository,
    private readonly trackRepository: TrackRepository,
    private readonly providerFactory: LyricsInterpretationProviderFactory = () =>
      LLMClient.createRotation(),
  ) {}

  async prepareStream(trackId: string): Promise<AsyncIterable<LyricsInterpretationEvent>> {
    const cached = await this.lyricsRepository.getInterpretation(trackId);
    if (cached) {
      return singleEvent({
        type: LYRICS_INTERPRETATION_EVENT_TYPES.CACHED,
        interpretation: cached,
      });
    }

    const lyrics = await this.lyricsRepository.findByTrackId(trackId);
    if (
      !lyrics ||
      lyrics.status !== LYRICS_STATUSES.FOUND ||
      !lyrics.plainLyrics
    ) {
      throw new LyricsNotFoundError(trackId, 'Lyrics not found for this track');
    }

    const track = await this.trackRepository.findById(trackId);
    if (!track) throw new LyricsNotFoundError(trackId, 'Track not found');

    const provider = this.providerFactory();
    const stream = provider.generateStream({
      messages: [
        { role: 'system', content: LYRICS_INTERPRETATION_PROMPT },
        {
          role: 'user',
          content: `Song: "${track.title}" by ${track.artists[0]?.name ?? 'Unknown Artist'}\n\nLyrics:\n${lyrics.plainLyrics}`,
        },
      ],
    });

    return this.streamAndPersist(trackId, stream);
  }

  private async *streamAndPersist(
    trackId: string,
    stream: AsyncIterable<InterpretationProviderEvent>,
  ): AsyncGenerator<LyricsInterpretationEvent> {
    let fullText = '';
    for await (const event of stream) {
      if (event.delta) {
        fullText += event.delta;
        yield {
          type: LYRICS_INTERPRETATION_EVENT_TYPES.DELTA,
          delta: event.delta,
        };
      }
      if (event.done) {
        await this.lyricsRepository.saveInterpretation(trackId, fullText);
        yield { type: LYRICS_INTERPRETATION_EVENT_TYPES.DONE };
      }
    }
  }
}

async function* singleEvent(
  event: LyricsInterpretationEvent,
): AsyncGenerator<LyricsInterpretationEvent> {
  yield event;
}
