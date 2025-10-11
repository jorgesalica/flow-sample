import fs from 'fs';

import { ENV_FILE } from './config';

export interface RawEnv {
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REDIRECT_URI?: string;
  SPOTIFY_AUTHORIZATION_CODE?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
  SPOTIFY_AUDIO_FEATURES_MODE?: string;
  SPOTIFY_PAGE_LIMIT?: string;
}

export function loadEnvVariables(filePath: string = ENV_FILE): RawEnv {
  let contents = '';
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read ${filePath}. Make sure the file exists and includes the required Spotify credentials. (${message})`
    );
  }

  const env: RawEnv = {};
  contents.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    env[key as keyof RawEnv] = rest.join('=').trim();
  });

  return env;
}
