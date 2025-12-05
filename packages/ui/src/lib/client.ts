import { treaty } from '@elysiajs/eden';
import type { App } from '@flows/backend/src/api/app';

// Type-safe API client using Eden
// This provides autocompletion and type checking for all API calls
export const api = treaty<App>('localhost:4173');

// Re-export types from the client for convenience
export type { App };
