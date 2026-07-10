import { OpenAICompatibleProvider } from '../openai-compatible';
import { CEREBRAS_MODELS, CEREBRAS_DEFAULT_MODEL, CEREBRAS_BASE_URL } from './models';

export class CerebrasProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string, defaultModel?: string) {
        super(apiKey, {
            baseUrl: CEREBRAS_BASE_URL,
            providerName: 'cerebras',
            defaultModel: CEREBRAS_DEFAULT_MODEL,
            catalog: CEREBRAS_MODELS,
        }, defaultModel);
    }
}

export default CerebrasProvider;
