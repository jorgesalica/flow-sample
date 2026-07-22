import { describe, it, expect } from 'vitest';
import { parseOpenAIStream } from '../../src/llm/providers/stream-parser';
import type { LLMStreamEvent } from '../../src/llm/types';

function makeSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return { body: { getReader: () => stream.getReader() } } as unknown as Response;
}

function sseData(obj: object): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

async function collect(gen: AsyncGenerator<LLMStreamEvent>): Promise<LLMStreamEvent[]> {
  const events: LLMStreamEvent[] = [];
  for await (const e of gen) {
    events.push(e);
  }
  return events;
}

describe('parseOpenAIStream', () => {
  it('yields a text delta then a done event', async () => {
    const chunk = sseData({ choices: [{ delta: { content: 'hello' } }] });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ delta: 'hello', done: false });
    expect(events[1].done).toBe(true);
    expect(events[1].response?.content).toBe('hello');
  });

  it('assembles multiple deltas into full content', async () => {
    const chunk =
      sseData({ choices: [{ delta: { content: 'foo' } }] }) +
      sseData({ choices: [{ delta: { content: ' bar' } }] });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    const done = events.find((e) => e.done);
    expect(done?.response?.content).toBe('foo bar');
  });

  it('skips data: [DONE] lines', async () => {
    const chunk = sseData({ choices: [{ delta: { content: 'hi' } }] }) + 'data: [DONE]\n\n';
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    const doneEvent = events.find((e) => e.done);
    expect(doneEvent?.response?.content).toBe('hi');
  });

  it('silently skips malformed JSON lines', async () => {
    const chunk = 'data: {bad json}\n\n' + sseData({ choices: [{ delta: { content: 'ok' } }] });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    const doneEvent = events.find((e) => e.done);
    expect(doneEvent?.response?.content).toBe('ok');
  });

  it('skips SSE comment lines (: ...)', async () => {
    const chunk = ':keepalive\n\n' + sseData({ choices: [{ delta: { content: 'x' } }] });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    expect(events[0]).toEqual({ delta: 'x', done: false });
  });

  it('skips empty delta chunks without yielding a text event', async () => {
    const chunk =
      sseData({ choices: [{ delta: {} }] }) + sseData({ choices: [{ delta: { content: 'hi' } }] });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    const textEvents = events.filter((e) => !e.done);
    expect(textEvents).toHaveLength(1);
    expect(textEvents[0].delta).toBe('hi');
  });

  it('captures usage from the last chunk', async () => {
    const chunk =
      sseData({ choices: [{ delta: { content: 'word' } }] }) +
      sseData({
        choices: [{ delta: {} }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    const doneEvent = events.find((e) => e.done);
    expect(doneEvent?.response?.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  });

  it('overrides modelName with json.model from response', async () => {
    const chunk = sseData({
      model: 'llama-3.3-70b-actual',
      choices: [{ delta: { content: 'hi' } }],
    });
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama-default', Date.now()));

    const doneEvent = events.find((e) => e.done);
    expect(doneEvent?.response?.model).toBe('llama-3.3-70b-actual');
  });

  it('final done event has correct provider and latencyMs shape', async () => {
    const chunk = sseData({ choices: [{ delta: { content: 'x' } }] });
    const startTime = Date.now() - 100;
    const response = makeSSEResponse([chunk]);
    const events = await collect(parseOpenAIStream(response, 'cerebras', 'model-x', startTime));

    const doneEvent = events.find((e) => e.done);
    expect(doneEvent?.response?.provider).toBe('cerebras');
    expect(doneEvent?.response?.latencyMs).toBeGreaterThanOrEqual(100);
  });

  it('handles split chunks where a line spans two reads', async () => {
    const fullLine = sseData({ choices: [{ delta: { content: 'split' } }] });
    const mid = Math.floor(fullLine.length / 2);
    const response = makeSSEResponse([fullLine.slice(0, mid), fullLine.slice(mid)]);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    const doneEvent = events.find((e) => e.done);
    expect(doneEvent?.response?.content).toBe('split');
  });

  it('yields only the done event for an empty stream', async () => {
    const response = makeSSEResponse(['']);
    const events = await collect(parseOpenAIStream(response, 'groq', 'llama', Date.now()));

    expect(events).toHaveLength(1);
    expect(events[0].done).toBe(true);
    expect(events[0].response?.content).toBe('');
  });
});
