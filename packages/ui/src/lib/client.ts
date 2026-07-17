import { treaty } from '@elysiajs/eden';
import type { App } from '@flows/backend/src/api/app';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL ?? '');

// Type-safe API client using Eden. The default empty base resolves to same-origin:
// Vite proxies /api in dev, and the backend serves the built UI in production.
export function createApiClient(customFetch?: typeof fetch) {
  return treaty<App>(apiBaseUrl, {
    keepDomain: true,
    fetcher: customFetch,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient();

// Re-export types from the client for convenience
export type { App };
