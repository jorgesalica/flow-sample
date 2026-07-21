import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BoardApplication } from '@flows/board';
import { BOARD_LAYOUT_VERSION, type BoardsSnapshot } from '@flows/shared';
import { createApp } from '../../src/api/app';
import type { BackendConfig } from '../../src/api/config';

const temporaryDirectories: string[] = [];

const boardSnapshot: BoardsSnapshot = {
  boards: [
    {
      id: 'default',
      name: 'My Board',
      isDefault: true,
      layoutVersion: BOARD_LAYOUT_VERSION,
      items: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  activeBoard: {
    id: 'default',
    name: 'My Board',
    isDefault: true,
    layoutVersion: BOARD_LAYOUT_VERSION,
    items: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

const boardApplication: BoardApplication = {
  snapshot: () => boardSnapshot,
  create: () => boardSnapshot,
  rename: () => boardSnapshot,
  updateLayout: () => boardSnapshot,
  select: () => boardSnapshot,
  delete: () => boardSnapshot,
};

function hostOptions(uiBuildPath: string) {
  return { uiBuildPath, boardApplication };
}

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
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('serves the health route without binding a port', async () => {
    const app = createApp(makeConfig(), hostOptions(path.join(tmpdir(), 'missing-ui-build')));
    const response = await app.handle(new Request('http://localhost/api/health'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ok',
      flows: ['spotify', 'lyrics', 'trading', 'chat', 'canvas'],
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('applies CORS to API preflight requests', async () => {
    const app = createApp(makeConfig(), hostOptions(path.join(tmpdir(), 'missing-ui-build')));
    const response = await app.handle(
      new Request('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'PATCH',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('returns a sanitized 404 when no UI build is available', async () => {
    const app = createApp(makeConfig(), hostOptions(path.join(tmpdir(), 'missing-ui-build')));
    const response = await app.handle(new Request('http://localhost/not-found'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Not Found' });
  });

  it('serves the UI entrypoint for client-side routes', async () => {
    const uiBuildPath = mkdtempSync(path.join(tmpdir(), 'flow-sample-ui-'));
    temporaryDirectories.push(uiBuildPath);
    writeFileSync(path.join(uiBuildPath, 'index.html'), '<main>Flow Sample</main>');
    const app = createApp(makeConfig(), hostOptions(uiBuildPath));

    const response = await app.handle(new Request('http://localhost/board/example'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    await expect(response.text()).resolves.toBe('<main>Flow Sample</main>');

    const missingApiResponse = await app.handle(new Request('http://localhost/api/missing'));
    expect(missingApiResponse.status).toBe(404);
    await expect(missingApiResponse.json()).resolves.toEqual({ error: 'Not Found' });
  });

  it('sanitizes unexpected route failures', async () => {
    const app = createApp(makeConfig(), {
      uiBuildPath: path.join(tmpdir(), 'missing-ui-build'),
      boardApplication,
    }).get('/api/failure', () => {
      throw new Error('provider credentials leaked');
    });

    const response = await app.handle(new Request('http://localhost/api/failure'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal Server Error' });
  });
});
