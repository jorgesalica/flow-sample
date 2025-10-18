import { FILES } from '../config';
import type { CliOptions } from '../types';
import {
  createClientFromEnv,
  authenticate,
  exportLikedSongs,
  runEnrichment,
  compactLikedSongs,
  parsePageLimit,
} from './exporter';
import { ensureTrimmed } from '../utils';

export interface FlowStep {
  name:
    | 'loadEnv'
    | 'authenticate'
    | 'exportLikedSongs'
    | 'enrichLikedSongs'
    | 'compactLikedSongs';
  status: 'started' | 'completed' | 'skipped';
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface FlowLogEntry {
  level: 'info' | 'error';
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface FlowRunConfig {
  actions: CliOptions['actions'];
  inputPath?: string;
  inputProvided?: boolean;
  pageLimitOverride?: number;
}

export interface FlowRunHooks {
  onStep?: (step: FlowStep) => void;
  onLog?: (entry: FlowLogEntry) => void;
}

export interface FlowRunResult {
  actions: CliOptions['actions'];
  executed: {
    export: boolean;
    enrich: boolean;
    compact: boolean;
  };
  steps: FlowStep[];
  logs: FlowLogEntry[];
  pageLimit?: number;
  refreshTokenStored?: boolean;
}

function now(): string {
  return new Date().toISOString();
}

function createStepRecorder(hooks: FlowRunHooks | undefined, steps: FlowStep[]) {
  return (step: FlowStep) => {
    steps.push(step);
    hooks?.onStep?.(step);
  };
}

function createLogger(hooks: FlowRunHooks | undefined, logs: FlowLogEntry[]) {
  return (entry: FlowLogEntry) => {
    logs.push(entry);
    hooks?.onLog?.(entry);
  };
}

export async function runSpotifyFlow(
  config: FlowRunConfig,
  hooks?: FlowRunHooks,
): Promise<FlowRunResult> {
  const steps: FlowStep[] = [];
  const logs: FlowLogEntry[] = [];

  const recordStep = createStepRecorder(hooks, steps);
  const recordLog = createLogger(hooks, logs);

  const { actions } = config;

  const executed = {
    export: false,
    enrich: false,
    compact: false,
  };

  let pageLimit: number | undefined;
  let refreshTokenStored = false;

  try {
    if (actions.export || actions.enrich) {
      recordLog({ level: 'info', message: 'Loading Spotify credentials from environment.', timestamp: now() });
      recordStep({ name: 'loadEnv', status: 'started', timestamp: now() });

      const setup = createClientFromEnv();
      const client = setup.client;
      const env = setup.env;

      const trimmedPageLimit = ensureTrimmed(env.SPOTIFY_PAGE_LIMIT);
      pageLimit = config.pageLimitOverride ?? parsePageLimit(trimmedPageLimit);

      recordStep({ name: 'loadEnv', status: 'completed', timestamp: now(), meta: { pageLimit } });

      recordLog({ level: 'info', message: 'Authenticating with Spotify.', timestamp: now() });
      recordStep({ name: 'authenticate', status: 'started', timestamp: now() });

      const auth = await authenticate(client, env);
      refreshTokenStored = Boolean(auth.refreshToken);

      recordStep({
        name: 'authenticate',
        status: 'completed',
        timestamp: now(),
        meta: { refreshTokenStored },
      });

      if (actions.export) {
        recordLog({ level: 'info', message: 'Exporting liked songs.', timestamp: now(), meta: { pageLimit } });
        recordStep({
          name: 'exportLikedSongs',
          status: 'started',
          timestamp: now(),
          meta: { pageLimit },
        });

        await exportLikedSongs({
          client,
          accessToken: auth.accessToken,
          pageLimit,
        });

        recordStep({
          name: 'exportLikedSongs',
          status: 'completed',
          timestamp: now(),
          meta: { outputPath: FILES.likedJson },
        });

        executed.export = true;
      }

      if (actions.enrich) {
        const enrichInputPath =
          config.inputProvided && config.inputPath ? config.inputPath : FILES.likedJson;

        recordLog({
          level: 'info',
          message: 'Enriching liked songs with album and artist metadata.',
          timestamp: now(),
          meta: { inputPath: enrichInputPath },
        });

        recordStep({
          name: 'enrichLikedSongs',
          status: 'started',
          timestamp: now(),
          meta: { inputPath: enrichInputPath },
        });

        await runEnrichment({
          client,
          accessToken: auth.accessToken,
          inputPath: enrichInputPath,
        });

        recordStep({
          name: 'enrichLikedSongs',
          status: 'completed',
          timestamp: now(),
          meta: { outputPathJson: FILES.enrichedJson, outputPathCsv: FILES.enrichedCsv },
        });

        executed.enrich = true;
      }
    } else {
      recordStep({ name: 'loadEnv', status: 'skipped', timestamp: now() });
      recordStep({ name: 'authenticate', status: 'skipped', timestamp: now() });
    }

    if (actions.compact) {
      const compactInputPath =
        config.inputProvided && config.inputPath && !actions.enrich
          ? config.inputPath
          : FILES.enrichedJson;

      recordLog({
        level: 'info',
        message: 'Compacting enriched liked songs.',
        timestamp: now(),
        meta: { inputPath: compactInputPath },
      });

      recordStep({
        name: 'compactLikedSongs',
        status: 'started',
        timestamp: now(),
        meta: { inputPath: compactInputPath },
      });

      await compactLikedSongs({
        inputPath: compactInputPath,
        outputPath: FILES.compactJson,
      });

      recordStep({
        name: 'compactLikedSongs',
        status: 'completed',
        timestamp: now(),
        meta: { outputPath: FILES.compactJson },
      });

      executed.compact = true;
    } else {
      recordStep({ name: 'compactLikedSongs', status: 'skipped', timestamp: now() });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordLog({ level: 'error', message, timestamp: now() });

    if (typeof error === 'object' && error !== null) {
      Object.assign(error, {
        logs,
        steps,
        executed,
        pageLimit,
      });
    }

    throw error;
  }

  return {
    actions,
    executed,
    steps,
    logs,
    pageLimit,
    refreshTokenStored,
  };
}
