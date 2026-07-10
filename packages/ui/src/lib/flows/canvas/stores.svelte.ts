import type { CanvasAnalysis } from '@flows/shared';
import * as api from './api';
import { showError } from '@lib/toast';
import { invalidateData } from '@lib/invalidate';
import { INVALIDATION } from '@lib/invalidation';

/**
 * Runes-based canvas store (replaces the previous svelte/store writable).
 *
 * State lives in `$state` fields on a single class instance exported as
 * `canvasStore`. Consumers read reactive values via the getters
 * (`canvasStore.canvases`, `canvasStore.activeCanvas`, …) and mutate through
 * the action methods, exactly mirroring the old store's public surface.
 */
class CanvasStore {
  #canvases = $state<CanvasAnalysis[]>([]);
  #activeCanvas = $state<CanvasAnalysis | null>(null);
  #isLoading = $state(false);
  #isAnalyzing = $state(false);

  get canvases(): CanvasAnalysis[] {
    return this.#canvases;
  }

  get activeCanvas(): CanvasAnalysis | null {
    return this.#activeCanvas;
  }

  get isLoading(): boolean {
    return this.#isLoading;
  }

  get isAnalyzing(): boolean {
    return this.#isAnalyzing;
  }

  /**
   * Seed the list from data fetched elsewhere (e.g. the route loader),
   * avoiding a redundant client-side fetch on mount.
   */
  setCanvases(canvases: CanvasAnalysis[]): void {
    this.#canvases = canvases;
  }

  async init(): Promise<void> {
    try {
      this.#isLoading = true;
      this.#canvases = await api.fetchCanvasList();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      this.#isLoading = false;
    }
  }

  async loadCanvas(id: string): Promise<void> {
    try {
      this.#isLoading = true;
      this.#activeCanvas = await api.fetchCanvas(id);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      this.#isLoading = false;
    }
  }

  async deleteCanvas(id: string): Promise<void> {
    try {
      await api.deleteCanvas(id);
      this.#canvases = this.#canvases.filter((c) => c.sourceId !== id);
      if (this.#activeCanvas?.sourceId === id) {
        this.#activeCanvas = null;
      }
      await invalidateData(INVALIDATION.CANVAS_LIST);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    }
  }

  async createAndAnalyze(text: string, title?: string, author?: string): Promise<void> {
    try {
      this.#isAnalyzing = true;
      const newCanvas = await api.createAndAnalyzeCanvas(text, title, author);
      this.#canvases = [newCanvas, ...this.#canvases];
      this.#activeCanvas = newCanvas;
      await invalidateData(INVALIDATION.CANVAS_LIST);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : String(e));
    } finally {
      this.#isAnalyzing = false;
    }
  }

  clearActive(): void {
    this.#activeCanvas = null;
  }
}

export const canvasStore = new CanvasStore();
