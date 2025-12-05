import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import * as path from 'path';
import * as fs from 'fs/promises';

import { loadConfig } from '../spotify-flow/config/schema';
import { SpotifyAdapter } from '../spotify-flow/adapters/spotify';
import { FileSystemAdapter } from '../spotify-flow/adapters/filesystem';
import { FlowEngine } from '../spotify-flow/core/engine';
import { logger } from '../spotify-flow/core/logger';

const config = loadConfig();
const log = logger.child({ module: 'Server' });

const projectRoot = path.resolve(__dirname, '..', '..');
const uiRoot = path.join(projectRoot, 'ui');
const distPath = path.join(uiRoot, 'dist');

function createApp() {
  const app = new Hono();

  // Middleware
  app.use('*', cors());
  app.use('*', honoLogger());

  // API Routes
  app.get('/api/status', (c) => {
    return c.json({ success: true, message: 'Server ready.' });
  });

  app.post('/api/spotify/run', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const limit = typeof body.limit === 'number' ? body.limit : config.spotify.pageLimit;

      log.info({ limit }, 'Running Spotify flow via API');

      const spotify = new SpotifyAdapter(config.spotify);
      const storage = new FileSystemAdapter(config.paths.output);
      const engine = new FlowEngine(spotify, storage);

      await engine.run({ limit });

      return c.json({
        success: true,
        message: 'Flow completed.',
        output: 'liked_songs.json',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ error: message }, 'Spotify flow failed');
      return c.json({ success: false, error: message }, 500);
    }
  });

  // Serve output files
  app.use('/outputs/*', serveStatic({ root: projectRoot }));

  return app;
}

async function startServer() {
  const app = createApp();
  const port = config.app.port;
  const host = config.app.host;

  // Check if dist folder exists for production serving
  const hasDistFolder = await fs
    .access(distPath)
    .then(() => true)
    .catch(() => false);

  if (hasDistFolder) {
    app.use('/*', serveStatic({ root: distPath }));

    // SPA fallback
    app.get('*', async (c) => {
      const indexPath = path.join(distPath, 'index.html');
      const html = await fs.readFile(indexPath, 'utf-8');
      return c.html(html);
    });
  }

  log.info({ host, port }, 'Server starting...');

  serve(
    {
      fetch: app.fetch,
      port,
      hostname: host,
    },
    (info) => {
      log.info({ host: info.address, port: info.port }, 'Server started');
      if (!hasDistFolder) {
        log.info(
          'UI dist not found. Run "cd ui && npm run build" for production, or use Vite dev server.',
        );
      }
    },
  );
}

startServer().catch((err) => {
  log.error({ error: err.message }, 'Failed to start server');
  process.exit(1);
});
