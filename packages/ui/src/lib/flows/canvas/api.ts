import type { CanvasAnalysis } from '@flows/shared';
import { api } from '@lib/client';
import { parseCanvasAnalysis, parseCanvasAnalysisList } from './contract';

function readBackendError(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('error' in value)) return undefined;
  return typeof value.error === 'string' ? value.error : undefined;
}

export async function fetchCanvasList(): Promise<CanvasAnalysis[]> {
  const { data, error } = await api.api.canvas.get();
  if (error) throw new Error('Failed to fetch canvases');
  return parseCanvasAnalysisList(data ?? []);
}

export async function fetchCanvas(id: string): Promise<CanvasAnalysis> {
  const { data, error } = await api.api.canvas({ id }).get();
  if (error || !data || 'error' in data) throw new Error('Failed to fetch canvas');
  return parseCanvasAnalysis(data);
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
    throw new Error(readBackendError(error.value) ?? 'Failed to create canvas');
  }
  if (!data) throw new Error('Failed to create canvas');
  return parseCanvasAnalysis(data);
}
