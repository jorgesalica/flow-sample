import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Polyfills jsdom is missing, needed by Svelte transitions, charts and UI libs.
if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { supports: () => false } as unknown as typeof CSS;
}

if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function () {
    return {
      finished: Promise.resolve(),
      cancel: () => {},
      abort: () => {},
    } as unknown as Animation;
  };
}

if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
