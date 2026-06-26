import type { Annotation } from '@flows/shared';

/**
 * The "meaning" layer id. Meaning annotations may target a whole phrase via a
 * `tokenIds` array; every other layer targets a single `tokenId`.
 */
const MEANING_LAYER_ID = 'meaning';

/**
 * A raw annotation as produced by the LLM, before phrase expansion.
 * Meaning annotations may carry a `tokenIds` array (a phrase) and/or a single
 * `tokenId` fallback; other layers carry only `tokenId`.
 */
export interface RawAnnotation {
  layerId: string;
  tokenId?: string;
  tokenIds?: string[];
  [key: string]: unknown;
}

/**
 * Expand meaning annotations whose `tokenIds` array spans a phrase into one
 * annotation per token, stripping the collapsed `tokenIds` array. Non-meaning
 * annotations pass through unchanged. Pure: no I/O, deterministic.
 */
export function expandMeaningAnnotations(annotations: RawAnnotation[]): Annotation[] {
  const expanded: Annotation[] = [];

  for (const ann of annotations) {
    if (ann.layerId === MEANING_LAYER_ID) {
      const tids = ann.tokenIds || (ann.tokenId ? [ann.tokenId] : []);
      for (const tid of tids) {
        expanded.push({
          ...ann,
          tokenIds: undefined,
          tokenId: tid,
        } as unknown as Annotation);
      }
    } else {
      expanded.push(ann as unknown as Annotation);
    }
  }

  return expanded;
}
