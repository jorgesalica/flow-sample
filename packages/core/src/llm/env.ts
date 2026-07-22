import type { LLMProviderType } from './client';

export type LLMEnv = Record<string, string | undefined>;

export interface LLMRuntimeConfig {
  provider: LLMProviderType | 'rotation';
  model?: string;
  apiKeys: Partial<Record<LLMProviderType, string>>;
}

const PROVIDER_ENV_VARS: Record<LLMProviderType, string> = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  mistral: 'MISTRAL_API_KEY',
};

const PROVIDERS = Object.keys(PROVIDER_ENV_VARS) as LLMProviderType[];

export function createLLMConfigFromEnv(env: LLMEnv = process.env): LLMRuntimeConfig {
  const requestedProvider = env.LLM_PROVIDER || 'gemini';
  const provider =
    requestedProvider === 'rotation' || PROVIDERS.includes(requestedProvider as LLMProviderType)
      ? (requestedProvider as LLMProviderType | 'rotation')
      : 'gemini';
  const apiKeys: Partial<Record<LLMProviderType, string>> = {};

  for (const type of PROVIDERS) {
    const value = env[PROVIDER_ENV_VARS[type]];
    if (value) apiKeys[type] = value;
  }

  return { provider, model: env.LLM_MODEL, apiKeys };
}

export function getProviderEnvVar(type: LLMProviderType): string {
  return PROVIDER_ENV_VARS[type];
}
