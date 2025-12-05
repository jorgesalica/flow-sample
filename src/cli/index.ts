#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../api/config';
import { SpotifyApiAdapter } from '../infrastructure/adapters/spotify-api';
import { SQLiteTrackRepository } from '../infrastructure/repositories';
import { SpotifyUseCase } from '../application';
import { logger } from '../application';
import { FlowError, SpotifyAuthError, SpotifyRateLimitError, StorageError } from '../domain/shared';

const program = new Command();
const log = logger.child({ module: 'CLI' });

program.name('spotify-flow').description('Export your Spotify liked songs').version('2.0.0');

program
  .command('run')
  .description('Fetch and save liked songs')
  .option('-l, --limit <number>', 'Number of pages to fetch (50 tracks/page)', '20')
  .action(async (options) => {
    try {
      const config = loadConfig();

      const adapter = new SpotifyApiAdapter({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        refreshToken: config.spotify.refreshToken,
      });
      const repository = new SQLiteTrackRepository();
      const useCase = new SpotifyUseCase(adapter, repository);

      const result = await useCase.fetchAndSave({
        limit: parseInt(options.limit),
      });

      log.info({ count: result.count }, 'Flow completed');
    } catch (error) {
      if (error instanceof SpotifyAuthError) {
        log.error({ error: error.message }, 'Authentication failed');
      } else if (error instanceof SpotifyRateLimitError) {
        log.error({ retryAfter: error.retryAfterSeconds }, 'Rate limited');
      } else if (error instanceof StorageError) {
        log.error({ path: error.path, error: error.message }, 'Storage error');
      } else if (error instanceof FlowError) {
        log.error({ error: error.message }, 'Flow error');
      } else {
        log.error({ error: error instanceof Error ? error.message : error }, 'Unexpected error');
      }
      process.exit(1);
    }
  });

program.parse();
