/**
 * @flows/backend — Thin Server Shell
 *
 * This package is just the Elysia server that composes
 * route modules from each flow package.
 */
import * as path from 'path';
import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import * as fs from 'fs';
import { createSpotifyRoutes } from '@flows/spotify';
import { createLyricsRoutes } from '@flows/lyrics';
import { createTradingConfigFromEnv, createTradingRoutes } from '@flows/trading';
import { createChatRoutes } from '@flows/chat';
import { createCanvasFlowRoutes } from '@flows/canvas';
import { logger } from '@flows/core';
import type { BackendConfig } from './config';

const log = logger.child({ module: 'Server' });

// Check if the SvelteKit static output exists for same-origin serving.
const uiBuildPath = path.resolve(__dirname, '../../../ui/build');

export function createApp(config: BackendConfig) {
  const hasUiBuild = fs.existsSync(uiBuildPath);

  return new Elysia({ adapter: node() })
    // CORS
    .use(
      cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      }),
    )

    // Static UI serving (if built)
    .use(
      hasUiBuild
        ? staticPlugin({
            assets: uiBuildPath,
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
      flows: ['spotify', 'lyrics', 'trading', 'chat', 'canvas'],
    }))

    // Flow routes (from flow packages)
    .use(createSpotifyRoutes(config))
    .use(createLyricsRoutes())
    .use(createTradingRoutes(createTradingConfigFromEnv()))
    .use(createChatRoutes())
    .use(createCanvasFlowRoutes())

    // Error handler
    .onError(({ error, code, set }) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      log.error({ error: errMsg, code }, 'Request error');

      if (code === 'NOT_FOUND') {
        // Try to serve index.html for SPA routing
        if (hasUiBuild) {
          const indexPath = path.join(uiBuildPath, 'index.html');
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
}

// Export type for Eden
export type App = ReturnType<typeof createApp>;
