#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../config/schema';
import { SpotifyAdapter } from '../adapters/spotify';
import { FileSystemAdapter } from '../adapters/filesystem';
import { FlowEngine } from '../core/engine';
import { logger } from '../core/logger';
import { FlowError, SpotifyAuthError, SpotifyRateLimitError, StorageError } from '../core/errors';

const program = new Command();
const log = logger.child({ module: 'CLI' });

program
    .name('spotify-flow')
    .description('Export your Spotify liked songs')
    .version('2.0.0');

program
    .command('run')
    .description('Fetch and save liked songs')
    .option('-l, --limit <number>', 'Number of pages to fetch (50 tracks/page)', '20')
    .action(async (options) => {
        try {
            const config = loadConfig();

            const spotify = new SpotifyAdapter(config.spotify);
            const storage = new FileSystemAdapter(config.paths.output);
            const engine = new FlowEngine(spotify, storage);

            await engine.run({
                limit: parseInt(options.limit),
            });
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
