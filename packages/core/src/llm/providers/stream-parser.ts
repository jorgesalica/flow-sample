import type { LLMStreamEvent, LLMResponse } from './types';

/**
 * Parse an OpenAI-compatible SSE stream (used by Groq, OpenRouter, Cerebras, Mistral).
 *
 * Reads `data: {...}` lines from a fetch Response, yields text deltas,
 * then yields a final `done` event with the assembled LLMResponse.
 */
export async function* parseOpenAIStream(
    fetchResponse: Response,
    providerName: string,
    modelName: string,
    startTime: number,
): AsyncGenerator<LLMStreamEvent> {
    const reader = fetchResponse.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let responseModel = modelName;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop()!; // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue; // Skip comments and empty lines

                if (trimmed === 'data: [DONE]') continue;

                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta?.content ?? '';

                        // Capture usage if present (some providers send it on the last chunk)
                        if (json.usage) {
                            usage = {
                                inputTokens: json.usage.prompt_tokens ?? 0,
                                outputTokens: json.usage.completion_tokens ?? 0,
                                totalTokens: json.usage.total_tokens ?? 0,
                            };
                        }

                        if (json.model) {
                            responseModel = json.model;
                        }

                        if (delta) {
                            fullContent += delta;
                            yield { delta, done: false };
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    // Final event with full response
    const latencyMs = Date.now() - startTime;
    const finalResponse: LLMResponse = {
        content: fullContent,
        model: responseModel,
        provider: providerName,
        usage,
        latencyMs,
    };

    yield { delta: '', done: true, response: finalResponse };
}
