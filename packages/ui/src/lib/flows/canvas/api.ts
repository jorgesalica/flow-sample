import type { CanvasAnalysis } from '@flows/shared';

const API_BASE = 'http://localhost:4173/api/canvas';

export async function fetchCanvasList(): Promise<CanvasAnalysis[]> {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch canvases');
    return res.json();
}

export async function fetchCanvas(id: string): Promise<CanvasAnalysis> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch canvas');
    return res.json();
}

export async function deleteCanvas(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete canvas');
}

export async function createAndAnalyzeCanvas(text: string, title?: string, author?: string): Promise<CanvasAnalysis> {
    const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title, author }),
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create canvas');
    }
    
    return res.json();
}
