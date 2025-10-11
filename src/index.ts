#!/usr/bin/env node
import { FILES } from './config';
import { parseArgs, printHelp } from './cli';
import {
  createClientFromEnv,
  authenticate,
  exportLikedSongs,
  runEnrichment,
  compactLikedSongs,
  parsePageLimit,
} from './exporter';
import { ensureTrimmed } from './utils';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const { actions } = args;

  if (args.inputProvided && !actions.enrich && !actions.compact) {
    throw new Error('--input can only be used together with --enrich or --compact.');
  }

  let pageLimit: number | undefined;
  let accessToken: string | null = null;
  let client: ReturnType<typeof createClientFromEnv>['client'] | null = null;
  let env: ReturnType<typeof createClientFromEnv>['env'] | null = null;

  if (actions.export || actions.enrich) {
    const setup = createClientFromEnv();
    client = setup.client;
    env = setup.env;

    pageLimit = parsePageLimit(ensureTrimmed(env.SPOTIFY_PAGE_LIMIT));

    const auth = await authenticate(client, env);
    accessToken = auth.accessToken;

    if (actions.export && client && accessToken) {
      await exportLikedSongs({
        client,
        accessToken,
        pageLimit,
      });
    }

    if (actions.enrich && client && accessToken) {
      const enrichInputPath = args.inputProvided ? args.inputPath : FILES.likedJson;
      await runEnrichment({
        client,
        accessToken,
        inputPath: enrichInputPath,
      });
    }
  }

  if (actions.compact) {
    const compactInputPath =
      args.inputProvided && !actions.enrich ? args.inputPath : FILES.enrichedJson;
    await compactLikedSongs({
      inputPath: compactInputPath,
      outputPath: FILES.compactJson,
    });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('An error occurred:', message);
  process.exitCode = 1;
});
