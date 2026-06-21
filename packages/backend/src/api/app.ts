/**
 * @flows/backend — Thin Server Shell
 *
 * This package is just the Elysia server that composes
 * route modules from each flow package.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from monorepo root (2 levels up from packages/backend/)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import * as fs from 'fs';
import { createSpotifyRoutes } from '@flows/spotify';
import { createLyricsRoutes } from '@flows/lyrics';
import { createTradingRoutes } from '@flows/trading';
import { chatRoutes } from '@flows/chat';
import { logger } from '@flows/core';

const log = logger.child({ module: 'Server' });

// Load config from environment
const config = {
  port: parseInt(process.env.PORT || '4173'),
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
    pageLimit: parseInt(process.env.SPOTIFY_PAGE_LIMIT || '5'),
  },
};

// Check if UI dist folder exists for static serving
const uiDistPath = path.resolve(__dirname, '../../ui/dist');
const hasUiDist = fs.existsSync(uiDistPath);

export const app = new Elysia({ adapter: node() })
  // CORS
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )

  // Static UI serving (if built)
  .use(
    hasUiDist
      ? staticPlugin({
          assets: uiDistPath,
          prefix: '/',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
      : new Elysia(),
  )

  // Request ID middleware
  .derive(() => ({
    requestId: crypto.randomUUID(),
  }))

  // Health check
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    flows: ['spotify', 'lyrics', 'trading', 'chat'],
  }))

  // Flow routes (from flow packages)
  .use(createSpotifyRoutes(config))
  .use(createLyricsRoutes())
  .use(createTradingRoutes())
  .use(chatRoutes)

  // Error handler
  .onError(({ error, code, set }) => {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error({ error: errMsg, code }, 'Request error');

    if (code === 'NOT_FOUND') {
      // Try to serve index.html for SPA routing
      if (hasUiDist) {
        const indexPath = path.join(uiDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          set.headers['Content-Type'] = 'text/html';
          return fs.readFileSync(indexPath, 'utf-8');
        }
      }
      set.status = 404;
      return { error: 'Not Found' };
    }

    set.status = 500;
    return { error: 'Internal Server Error' };
  });

// Export type for Eden
export type App = typeof app;

// Start server
app.listen(config.port, () => {
  log.info({ port: config.port }, 'Server started');
  console.log(`🚀 Server running at http://localhost:${config.port}`);
  if (hasUiDist) {
    console.log(`📦 Serving UI from ${uiDistPath}`);
  }
});
