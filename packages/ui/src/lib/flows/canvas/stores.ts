import { writable } from 'svelte/store';
import type { CanvasAnalysis } from '@flows/shared';
import * as api from './api';
import { showError } from '@lib/toast';

function createCanvasStore() {
  const { subscribe, update } = writable<{
    canvases: CanvasAnalysis[];
    activeCanvas: CanvasAnalysis | null;
    isLoading: boolean;
    isAnalyzing: boolean;
  }>({
    canvases: [],
    activeCanvas: null,
    isLoading: false,
    isAnalyzing: false,
  });

  return {
    subscribe,

    async init() {
      try {
        update((s) => ({ ...s, isLoading: true }));
        const canvases = await api.fetchCanvasList();
        update((s) => ({ ...s, canvases, isLoading: false }));
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : String(e));
        update((s) => ({ ...s, isLoading: false }));
      }
    },

    async loadCanvas(id: string) {
      try {
        update((s) => ({ ...s, isLoading: true }));
        const activeCanvas = await api.fetchCanvas(id);
        update((s) => ({ ...s, activeCanvas, isLoading: false }));
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : String(e));
        update((s) => ({ ...s, isLoading: false }));
      }
    },

    async deleteCanvas(id: string) {
      try {
        await api.deleteCanvas(id);
        update((s) => ({
          ...s,
          canvases: s.canvases.filter((c) => c.sourceId !== id),
          activeCanvas: s.activeCanvas?.sourceId === id ? null : s.activeCanvas,
        }));
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : String(e));
      }
    },

    async createAndAnalyze(text: string, title?: string, author?: string) {
      try {
        update((s) => ({ ...s, isAnalyzing: true }));
        const newCanvas = await api.createAndAnalyzeCanvas(text, title, author);
        update((s) => ({
          ...s,
          canvases: [newCanvas, ...s.canvases],
          activeCanvas: newCanvas,
          isAnalyzing: false,
        }));
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : String(e));
        update((s) => ({ ...s, isAnalyzing: false }));
      }
    },

    clearActive() {
      update((s) => ({ ...s, activeCanvas: null }));
    },
  };
}

export const canvasStore = createCanvasStore();
