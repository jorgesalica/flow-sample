import type { FlowDefinition, FlowStats } from '../registry';
import CanvasFlow from './CanvasFlow.svelte';
import { fetchCanvasList } from './api';

async function getStats(): Promise<FlowStats> {
    try {
        const canvases = await fetchCanvasList();
        return {
            count: canvases.length,
            status: 'active',
            statusMessage: `${canvases.length} Canvases`
        };
    } catch {
        return {
            count: 0,
            status: 'error',
            statusMessage: 'Backend unavailable'
        };
    }
}

export const canvasFlow: FlowDefinition = {
    id: 'canvas-flow',
    name: 'Text Canvas',
    icon: '📝',
    description: 'Paste any text and get a deep literary AI analysis.',
    route: '#/canvas',
    color: 'from-cyan-400 to-blue-500',
    component: CanvasFlow,
    getStats
};
