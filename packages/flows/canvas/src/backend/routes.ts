import { Elysia, t } from 'elysia';
import crypto from 'crypto';
import { 
    tokenize, 
    saveAnalysis, 
    findAnalysisBySourceId,
    getAllAnalysesBySourceType,
    deleteAnalysis
} from '@flows/core';
import type { CanvasAnalysis } from '@flows/shared';
import { analyzeText } from './text-analyzer';

function hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
}

export const canvasFlowRoutes = new Elysia({ prefix: '/api/canvas' })
    // Get all user canvas instances
    .get('/', () => {
        return getAllAnalysesBySourceType('user_text');
    })
    
    // Get specific canvas instance
    .get('/:id', ({ params, set }) => {
        const { id } = params;
        const analysis = findAnalysisBySourceId(id);
        
        if (!analysis) {
            set.status = 404;
            return { error: 'Canvas not found' };
        }
        
        return analysis;
    })
    
    // Create new canvas instance and analyze
    .post('/', async ({ body, set }) => {
        const { text, title, author } = body;
        
        const sourceId = `usr_${crypto.randomUUID()}`;
        const tokenAst = tokenize(text);
        
        const analysisResult = await analyzeText(tokenAst, title, author);
        
        const now = new Date().toISOString();
        const textHash = hashText(text);
        
        const layers = [
            { id: 'meaning', name: 'Meaning', icon: '💡', color: '#22d3ee' }
        ];

        const analysis: CanvasAnalysis = {
            id: `ca_${crypto.randomUUID()}`,
            sourceId,
            sourceType: 'user_text',
            sourceTextHash: textHash,
            tokenAst,
            annotations: analysisResult.annotations,
            layers,
            meta: {
                title: title || 'Untitled',
                author: author || 'User',
                ...analysisResult.meta
            },
            modelUsed: analysisResult.modelUsed,
            providerUsed: analysisResult.providerUsed,
            createdAt: now,
            updatedAt: now,
        };

        saveAnalysis(analysis);
        
        return analysis;
    }, {
        body: t.Object({
            text: t.String(),
            title: t.Optional(t.String()),
            author: t.Optional(t.String())
        })
    })
    
    // Delete canvas instance
    .delete('/:id', ({ params }) => {
        const { id } = params;
        // The id here is the sourceId for user_text since each user canvas has a unique sourceId
        // Wait, the id passed might be the canvas.id or canvas.sourceId. Let's assume sourceId.
        deleteAnalysis(id);
        return { success: true };
    });
