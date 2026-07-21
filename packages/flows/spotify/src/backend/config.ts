export interface SpotifyRuntimeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  successUrl: string;
  refreshToken?: string;
  pageLimit: number;
}

export interface SpotifyRoutesConfig {
  spotify: SpotifyRuntimeConfig;
}
