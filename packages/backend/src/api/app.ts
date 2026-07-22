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
import { createSpotifyRoutes, createSpotifyService } from '@flows/spotify';
import { createLyricsRouteDependencies, createLyricsRoutes } from '@flows/lyrics';
import { createTradingConfigFromEnv, createTradingRoutes } from '@flows/trading';
import { createChatRoutes } from '@flows/chat';
import { createCanvasFlowApplication, createCanvasFlowRoutes } from '@flows/canvas';
import { createBoardRoutes, type BoardApplication } from '@flows/board';
import { logger } from '@flows/core';
import { createMusicDatabase } from '@flows/music';
import {
  createAnalysisRepository,
  type AnalysisRepository,
} from '@flows/analysis';
import type Database from 'better-sqlite3';
import type { BackendConfig } from './config';

const log = logger.child({ module: 'Server' });

// Check if the SvelteKit static output exists for same-origin serving.
const defaultUiBuildPath = path.resolve(__dirname, '../../../ui/build');

export interface BackendHostOptions {
  uiBuildPath?: string;
  boardApplication?: BoardApplication;
  musicDatabase?: Database.Database;
  analysisRepository?: AnalysisRepository;
}

export function createApp(config: BackendConfig, options: BackendHostOptions = {}) {
  const uiBuildPath = options.uiBuildPath ?? defaultUiBuildPath;
  const hasUiBuild = fs.existsSync(uiBuildPath);
  const musicDatabase = options.musicDatabase ?? createMusicDatabase();
  const analysisRepository =
    options.analysisRepository ?? createAnalysisRepository();
  const spotifyService = createSpotifyService(config, {
    database: musicDatabase,
  });
  const lyricsDependencies = createLyricsRouteDependencies(
    musicDatabase,
    analysisRepository,
  );
  const canvasApplication = createCanvasFlowApplication(analysisRepository);

  return (
    new Elysia({ adapter: node() })
      // CORS
      .use(
        cors({
          origin: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        }),
      )

      // Static UI serving (if built)
      .use(
        hasUiBuild
          ? staticPlugin({
              assets: uiBuildPath,
              prefix: '/',
              alwaysStatic: true,
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
      .use(createSpotifyRoutes(config, spotifyService))
      .use(createLyricsRoutes(lyricsDependencies))
      .use(createTradingRoutes(createTradingConfigFromEnv()))
      .use(createChatRoutes())
      .use(createCanvasFlowRoutes(canvasApplication))
      .use(createBoardRoutes(options.boardApplication))

      // Browser navigation falls back to the SPA, while unknown API paths stay JSON 404s.
      .get('/*', ({ path: requestPath, set }) => {
        if (!hasUiBuild || requestPath.startsWith('/api/')) {
          set.status = 404;
          return { error: 'Not Found' };
        }

        const indexPath = path.join(uiBuildPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
          set.status = 404;
          return { error: 'Not Found' };
        }

        return new Response(fs.readFileSync(indexPath, 'utf-8'), {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      })

      // Error handler
      .onError(({ error, code, set }) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        log.error({ error: errMsg, code }, 'Request error');

        if (code === 'NOT_FOUND') {
          set.status = 404;
          return { error: 'Not Found' };
        }

        set.status = 500;
        return { error: 'Internal Server Error' };
      })
  );
}

// Export type for Eden
export type App = ReturnType<typeof createApp>;
