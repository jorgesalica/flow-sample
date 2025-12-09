import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { staticPlugin } from '@elysiajs/static';
import { cors } from '@elysiajs/cors';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

import { loadConfig } from './config';
import { createSpotifyRoutes } from './spotify.routes';
import { createLyricsRoutes } from './lyrics.routes';
import { logger } from '@infra/logger';

const config = loadConfig();
const log = logger.child({ module: 'Server' });

const projectRoot = path.resolve(__dirname, '..', '..');
const uiDistPath = path.join(projectRoot, 'ui', 'dist');
const outputsPath = path.join(projectRoot, 'outputs');

const app = new Elysia({ adapter: node() })
  .use(cors())
  .onRequest(({ request }) => {
    // Generate request ID
    const requestId = randomUUID();

    request.headers.set('X-Request-ID', requestId);
  })
  .onAfterHandle(({ request, set }) => {
    const url = new URL(request.url).pathname;
    const method = request.method;

    log.info(
      {
        method,
        url,
        status: set.status,
        // requestId: request.headers.get('X-Request-ID'), // TODO: Pass via context
      },
      'Request processed',
    );
  })
  // Health check
  .get('/api/status', () => ({ success: true, message: 'Server ready.' }))

  // Spotify routes
  .use(createSpotifyRoutes(config))

  // Lyrics routes
  .use(createLyricsRoutes())

  // Serve outputs directory
  .use(
    staticPlugin({
      assets: outputsPath,
      prefix: '/outputs',
    }),
  )

  // Error handling
  .onError(({ error, set }) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(
      { error: message, stack: error instanceof Error ? error.stack : undefined },
      'Request error',
    );
    set.status = 500;
    return { success: false, error: message };
  });

// Conditionally serve UI if dist exists
if (fs.existsSync(uiDistPath)) {
  app.use(
    staticPlugin({
      assets: uiDistPath,
      prefix: '/',
    }),
  );

  // SPA fallback
  app.get('*', () => {
    const indexPath = path.join(uiDistPath, 'index.html');
    return new Response(fs.readFileSync(indexPath, 'utf-8'), {
      headers: { 'Content-Type': 'text/html' },
    });
  });
}

// Start server
const port = config.app.port;
const host = config.app.host;

log.info({ host, port }, 'Server starting...');

app.listen({ port, hostname: host }, ({ hostname, port }: { hostname: string; port: number }) => {
  log.info({ host: hostname, port }, 'Server started');
  if (!fs.existsSync(uiDistPath)) {
    log.info(
      'UI dist not found. Production build will fallback to API only. Use "pnpm dev" for local development.',
    );
  }
});

// Export for Eden client type inference
export type App = typeof app;
export default app;
