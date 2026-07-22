import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';
import { CanvasAnalysisError } from '../../src/domain/errors';
import { createCanvasFlowRoutes } from '../../src/backend/routes';
import type { CanvasApplication } from '../../src/backend/service';

function makeAnalysis(): CanvasAnalysis {
  return {
    id: 'ca_1',
    sourceId: 'usr_1',
    sourceType: 'user_text',
    sourceTextHash: 'hash',
    tokenAst: { totalTokens: 1, sections: [] },
    annotations: [],
    layers: [],
    modelUsed: 'gpt-oss-120b',
    providerUsed: 'cerebras',
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  };
}

const service = {
  list: vi.fn<CanvasApplication['list']>(),
  get: vi.fn<CanvasApplication['get']>(),
  create: vi.fn<CanvasApplication['create']>(),
  delete: vi.fn<CanvasApplication['delete']>(),
};

function request(path: string, init?: RequestInit): Promise<Response> {
  return createCanvasFlowRoutes(service).handle(new Request(`http://localhost${path}`, init));
}

describe('Canvas routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.list.mockReturnValue([]);
    service.get.mockReturnValue(null);
    service.delete.mockReturnValue(false);
  });

  it('lists user canvases through the application service', async () => {
    const analysis = makeAnalysis();
    service.list.mockReturnValue([analysis]);

    const response = await request('/api/canvas');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([analysis]);
  });

  it('maps a missing canvas to 404', async () => {
    const response = await request('/api/canvas/missing');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Canvas not found' });
  });

  it('returns the created analysis from the application service', async () => {
    const analysis = makeAnalysis();
    service.create.mockResolvedValue(analysis);

    const response = await request('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello', title: 'Test' }),
    });

    expect(response.status).toBe(200);
    expect(service.create).toHaveBeenCalledWith({ text: 'Hello', title: 'Test' });
    await expect(response.json()).resolves.toEqual(analysis);
  });

  it('maps analysis failures to a sanitized 503 response', async () => {
    service.create.mockRejectedValue(new CanvasAnalysisError('[mistral] secret provider response'));

    const response = await request('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello' }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'AI analysis is temporarily unavailable',
    });
  });

  it('deletes by source ID and reports absent canvases', async () => {
    service.delete.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const deleted = await request('/api/canvas/usr_1', { method: 'DELETE' });
    const missing = await request('/api/canvas/usr_1', { method: 'DELETE' });

    expect(deleted.status).toBe(200);
    await expect(deleted.json()).resolves.toEqual({ success: true });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Canvas not found' });
  });
});
