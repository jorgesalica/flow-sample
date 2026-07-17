import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TokenAST } from '@flows/shared';

const mocks = vi.hoisted(() => ({
    tokenize: vi.fn(),
    saveAnalysis: vi.fn(),
    findAnalysisBySourceId: vi.fn(),
    getAllAnalysesBySourceType: vi.fn(),
    deleteAnalysis: vi.fn(),
    analyzeText: vi.fn(),
}));

vi.mock('@flows/core', () => ({
    tokenize: mocks.tokenize,
    saveAnalysis: mocks.saveAnalysis,
    findAnalysisBySourceId: mocks.findAnalysisBySourceId,
    getAllAnalysesBySourceType: mocks.getAllAnalysesBySourceType,
    deleteAnalysis: mocks.deleteAnalysis,
}));

vi.mock('../../src/backend/text-analyzer', () => ({
    analyzeText: mocks.analyzeText,
}));

const { canvasFlowRoutes } = await import('../../src/backend/routes');

const tokenAst: TokenAST = {
    totalTokens: 1,
    sections: [
        {
            id: 'section-1',
            type: 'Paragraph',
            lines: [[{ id: 'token-1', text: 'Hello' }]],
        },
    ],
};

describe('Canvas routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.tokenize.mockReturnValue(tokenAst);
        mocks.analyzeText.mockResolvedValue({
            annotations: [],
            meta: { theme: 'Greeting', tone: 'Warm', summary: 'A greeting.' },
            modelUsed: 'gpt-oss-120b',
            providerUsed: 'cerebras',
        });
    });

    it('persists the provider metadata returned by the analyzer', async () => {
        const response = await canvasFlowRoutes.handle(
            new Request('http://localhost/api/canvas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello', title: 'Test' }),
            }),
        );

        expect(response.status).toBe(200);
        expect(mocks.saveAnalysis).toHaveBeenCalledWith(
            expect.objectContaining({
                modelUsed: 'gpt-oss-120b',
                providerUsed: 'cerebras',
            }),
        );
        await expect(response.json()).resolves.toEqual(
            expect.objectContaining({
                modelUsed: 'gpt-oss-120b',
                providerUsed: 'cerebras',
            }),
        );
    });
});
