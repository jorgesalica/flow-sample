/**
 * Process entrypoint for the backend host.
 *
 * Keep app construction import-safe: tests and typed clients import `app.ts`
 * without binding a port.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { logger } from '@flows/core';
import { createApp } from './app';
import { createBackendConfigFromEnv } from './config';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const log = logger.child({ module: 'Server' });
const config = createBackendConfigFromEnv();

if (!config.spotify.clientId || !config.spotify.clientSecret) {
  log.warn(
    'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set — Spotify flow will not authenticate',
  );
}

const app = createApp(config);

app.listen(config.port, () => {
  log.info({ port: config.port }, 'Server started');
  log.info({ url: `http://localhost:${config.port}` }, 'Listening');
});
