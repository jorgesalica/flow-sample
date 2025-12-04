#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from '../config/schema';
import { SpotifyAdapter } from '../adapters/spotify';
import { FileSystemAdapter } from '../adapters/filesystem';
import { FlowEngine } from '../core/engine';

const program = new Command();

program
    .name('spotify-flow')
    .description('CLI to export and process Spotify data')
    .version('2.0.0');

program
    .command('run')
    .description('Run the full flow (Export -> Enrich -> Save)')
    .option('-l, --limit <number>', 'Limit number of pages to fetch', '20')
    .action(async (options) => {
        try {
            const config = loadConfig();

            const spotify = new SpotifyAdapter(config.spotify);
            const fs = new FileSystemAdapter(config.paths.output);
            const engine = new FlowEngine(spotify, fs);

            await engine.run({
                limit: parseInt(options.limit),
                actions: {
                    export: true,
                    enrich: true,
                    compact: false, // Deprecated
                }
            });
        } catch (error) {
            console.error('Fatal Error:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

program.parse();
