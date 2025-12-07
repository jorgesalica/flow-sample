import { describe, it, expect, vi } from 'vitest';

/**
 * Auth Flow Tests - Token exchange and refresh logic
 * TODO: Mock Spotify API responses
 */
describe('Auth Flow', () => {
    describe('Token Exchange', () => {
        it.todo('exchanges authorization code for tokens');
        it.todo('saves tokens to repository');
        it.todo('throws on invalid code');
    });

    describe('Token Refresh', () => {
        it.todo('refreshes expired access token');
        it.todo('updates refresh token if rotated');
        it.todo('falls back to config refresh token');
    });
});
