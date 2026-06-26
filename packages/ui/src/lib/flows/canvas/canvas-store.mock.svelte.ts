import { vi } from 'vitest';
import type { CanvasAnalysis } from '@flows/shared';

/**
 * Runes-backed test double for the canvas store.
 *
 * Component tests can't construct `$state` inside a hoisted `vi.mock` factory
 * (that code isn't compiled as a `.svelte.ts` module). This helper lives in a
 * real `.svelte.ts` module so its reactive fields drive component re-renders,
 * while still exposing vi spies for the action methods.
 */
class MockCanvasStore {
  canvases = $state<CanvasAnalysis[]>([]);
  activeCanvas = $state<CanvasAnalysis | null>(null);
  isLoading = $state(false);
  isAnalyzing = $state(false);

  setCanvases = vi.fn((canvases: CanvasAnalysis[]) => {
    this.canvases = canvases;
  });
  init = vi.fn();
  loadCanvas = vi.fn();
  deleteCanvas = vi.fn();
  createAndAnalyze = vi.fn();
  clearActive = vi.fn();

  /** Reset all state + spies to a known baseline between tests. */
  reset(): void {
    this.canvases = [];
    this.activeCanvas = null;
    this.isLoading = false;
    this.isAnalyzing = false;
    this.setCanvases.mockClear();
    this.init.mockClear();
    this.loadCanvas.mockClear();
    this.deleteCanvas.mockClear();
    this.createAndAnalyze.mockClear();
    this.clearActive.mockClear();
  }
}

export const mockCanvasStore = new MockCanvasStore();
