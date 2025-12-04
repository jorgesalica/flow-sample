#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../config/schema';
import { SpotifyAdapter } from '../adapters/spotify';
import { FileSystemAdapter } from '../adapters/filesystem';
import { FlowEngine } from '../core/engine';

const program = new Command();

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
            console.error('Error:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
