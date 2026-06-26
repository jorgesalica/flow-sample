import type { Annotation } from '@flows/shared';

/**
 * Layer id whose annotations carry phrase-level token spans that must be
 * expanded into one annotation per token.
 */
const MEANING_LAYER_ID = 'meaning';

/**
 * Shape the LLM returns for a single annotation before expansion: the standard
 * {@link Annotation} fields, plus an optional phrase-level `tokenIds` span and a
 * single-token `tokenId` fallback.
 */
export type RawAnnotation = Omit<Annotation, 'tokenId'> & {
  tokenIds?: string[];
  tokenId?: string;
};

/**
 * Expand raw LLM annotations into the flat {@link Annotation} form persisted and
 * rendered by the canvas.
 *
 * Pure transform (no I/O): a `meaning` annotation that spans a phrase
 * (`tokenIds: [...]`) is fanned out into one annotation per token; the single
 * `tokenId` is used as a fallback. A meaning annotation with neither is dropped
 * (no token to attach it to). Non-meaning annotations pass through unchanged.
 */
export function expandAnnotations(rawAnnotations: RawAnnotation[]): Annotation[] {
  const expanded: RawAnnotation[] = [];

  for (const ann of rawAnnotations) {
    if (ann.layerId === MEANING_LAYER_ID) {
      const tokenIds = ann.tokenIds ?? (ann.tokenId ? [ann.tokenId] : []);
      for (const tokenId of tokenIds) {
        expanded.push({
          ...ann,
          tokenIds: undefined,
          tokenId,
        });
      }
    } else {
      expanded.push(ann);
    }
  }

  return expanded as Annotation[];
}
