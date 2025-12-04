#!/usr/bin/env node
import { parseArgs, printHelp } from './cli';
import { runSpotifyFlow } from './core/flowRunner';

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

  await runSpotifyFlow(
    {
      actions,
      inputPath: args.inputPath,
      inputProvided: args.inputProvided,
    },
    {
      onLog: (entry) => {
        if (entry.level === 'error') {
          console.error(entry.message);
        } else {
          console.log(entry.message);
        }
      },
    },
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('An error occurred:', message);
  process.exitCode = 1;
});
