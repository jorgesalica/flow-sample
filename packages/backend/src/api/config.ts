export interface BackendConfig {
  port: number;
  spotify: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    successUrl: string;
    refreshToken?: string;
    pageLimit: number;
  };
}

type Env = Record<string, string | undefined>;

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function createBackendConfigFromEnv(env: Env = process.env): BackendConfig {
  return {
    port: parseInteger(env.PORT, 4173),
    spotify: {
      clientId: env.SPOTIFY_CLIENT_ID || '',
      clientSecret: env.SPOTIFY_CLIENT_SECRET || '',
      redirectUri: env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:4173/api/spotify/auth/callback',
      successUrl: env.SPOTIFY_SUCCESS_URL || 'http://localhost:5173/spotify?connected=true',
      refreshToken: env.SPOTIFY_REFRESH_TOKEN,
      pageLimit: parseInteger(env.SPOTIFY_PAGE_LIMIT, 5),
    },
  };
}
