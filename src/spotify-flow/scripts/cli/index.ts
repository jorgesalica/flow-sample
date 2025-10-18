import { FILES } from '../config';
import type { CliOptions } from '../types';

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    actions: {
      export: false,
      enrich: false,
      compact: false,
    },
    inputPath: FILES.likedJson,
    inputProvided: false,
    help: false,
  };

  let anyActionSpecified = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--enrich':
        options.actions.enrich = true;
        anyActionSpecified = true;
        break;
      case '--export-and-enrich':
        options.actions.export = true;
        options.actions.enrich = true;
        anyActionSpecified = true;
        break;
      case '--compact':
        options.actions.compact = true;
        anyActionSpecified = true;
        break;
      case '--input': {
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
          throw new Error('Expected a file path after --input.');
        }
        options.inputPath = next;
        options.inputProvided = true;
        i += 1;
        break;
      }
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!anyActionSpecified && !options.help) {
    options.actions.export = true;
  }

  return options;
}

export function printHelp(): void {
  console.log(`Usage:
  node fetch_liked_songs.js [options]

Options:
  --enrich                 Enrich an existing JSON export (defaults to ${FILES.likedJson}).
  --export-and-enrich      Export liked songs and enrich them in a single run.
  --compact                Produce a compact JSON summary from an enriched export.
  --input <path>           Custom input JSON (used with --enrich or --compact).
  --help                   Show this message.
`);
}
