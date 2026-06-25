import { OpenAICompatibleProvider } from '../openai-compatible';
import { GROQ_MODELS, GROQ_DEFAULT_MODEL, GROQ_BASE_URL } from './models';

export class GroqProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string) {
        super(apiKey, {
            baseUrl: GROQ_BASE_URL,
            providerName: 'groq',
            defaultModel: GROQ_DEFAULT_MODEL,
            catalog: GROQ_MODELS,
        });
    }
}

export default GroqProvider;
