import { fetchModelCatalog, fetchConversations } from '@lib/flows/chat/api';
import { createApiClient } from '@lib/client';
import type { ChatInitialData } from '@lib/flows/chat/stores.svelte';
import { showError } from '@lib/toast';
import type { PageLoad } from './$types';

/**
 * Universal loader for the chat route.
 *
 * Fetches the model catalog and the conversation list up front (previously done
 * in the store's on-mount `init()`), and computes the default selected model
 * (first model of the first provider). Errors are surfaced via a toast and the
 * page falls back to empty defaults so it still renders — matching the old
 * `init()` try/catch behaviour. SSR is disabled at the root layout.
 */
export const load: PageLoad = async ({ fetch }): Promise<ChatInitialData> => {
  try {
    const requestApi = createApiClient(fetch);
    const [catalog, conversations] = await Promise.all([
      fetchModelCatalog(requestApi),
      fetchConversations(requestApi),
    ]);

    // Default: first model of first provider
    let selectedModel = '';
    if (catalog.length > 0 && catalog[0].models.length > 0) {
      selectedModel = `${catalog[0].provider}:${catalog[0].models[0].id}`;
    }

    return { catalog, conversations, selectedModel };
  } catch (e: unknown) {
    showError(e instanceof Error ? e.message : String(e));
    return { catalog: [], conversations: [], selectedModel: '' };
  }
};
