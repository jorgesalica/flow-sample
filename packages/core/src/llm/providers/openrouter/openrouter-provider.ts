import { OpenAICompatibleProvider } from '../openai-compatible';
import { OPENROUTER_MODELS, OPENROUTER_DEFAULT_MODEL, OPENROUTER_BASE_URL } from './models';

export class OpenRouterProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string, defaultModel?: string) {
        super(apiKey, {
            baseUrl: OPENROUTER_BASE_URL,
            providerName: 'openrouter',
            defaultModel: OPENROUTER_DEFAULT_MODEL,
            catalog: OPENROUTER_MODELS,
            extraHeaders: { 'HTTP-Referer': 'https://github.com/flow-sample' },
        }, defaultModel);
    }
}

export default OpenRouterProvider;
