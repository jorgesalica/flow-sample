import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app';
import type { BackendConfig } from '../../src/api/config';

function makeConfig(overrides: Partial<BackendConfig> = {}): BackendConfig {
  return {
    port: 4173,
    spotify: {
      clientId: '',
      clientSecret: '',
      redirectUri: 'http://127.0.0.1:4173/api/spotify/auth/callback',
      successUrl: 'http://localhost:5173/spotify?connected=true',
      refreshToken: undefined,
      pageLimit: 5,
    },
    ...overrides,
  };
}

describe('backend app', () => {
  it('serves the health route without binding a port', async () => {
    const app = createApp(makeConfig());
    const response = await app.handle(new Request('http://localhost/api/health'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      flows: ['spotify', 'lyrics', 'trading', 'chat', 'canvas'],
    });
  });
});
