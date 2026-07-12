import type { CanvasAnalysis } from '@flows/shared';
import { api } from '@lib/client';

export async function fetchCanvasList(): Promise<CanvasAnalysis[]> {
  const { data, error } = await api.api.canvas.get();
  if (error) throw new Error('Failed to fetch canvases');
  return (data ?? []) as unknown as CanvasAnalysis[];
}

export async function fetchCanvas(id: string): Promise<CanvasAnalysis> {
  const { data, error } = await api.api.canvas({ id }).get();
  if (error || !data || 'error' in data) throw new Error('Failed to fetch canvas');
  return data as unknown as CanvasAnalysis;
}

export async function deleteCanvas(id: string): Promise<void> {
  const { error } = await api.api.canvas({ id }).delete();
  if (error) throw new Error('Failed to delete canvas');
}

export async function createAndAnalyzeCanvas(
  text: string,
  title?: string,
  author?: string
): Promise<CanvasAnalysis> {
  const { data, error } = await api.api.canvas.post({ text, title, author });
  if (error) {
    const value = error.value as { error?: string } | undefined;
    throw new Error(value?.error || 'Failed to create canvas');
  }
  if (!data) throw new Error('Failed to create canvas');
  return data as unknown as CanvasAnalysis;
}
