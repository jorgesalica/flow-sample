import { OpenAICompatibleProvider } from '../openai-compatible';
import { MISTRAL_MODELS, MISTRAL_DEFAULT_MODEL, MISTRAL_BASE_URL } from './models';

export class MistralProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string) {
        super(apiKey, {
            baseUrl: MISTRAL_BASE_URL,
            providerName: 'mistral',
            defaultModel: MISTRAL_DEFAULT_MODEL,
            catalog: MISTRAL_MODELS,
        });
    }
}

export default MistralProvider;
