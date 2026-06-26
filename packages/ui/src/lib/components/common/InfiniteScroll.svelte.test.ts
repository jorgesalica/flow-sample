import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import InfiniteScroll from './InfiniteScroll.svelte';

// Controllable IntersectionObserver double: capture the callback the component
// registers so we can drive intersection events deterministically, and record
// observe/disconnect calls to assert lifecycle wiring.
type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let lastCallback: IOCallback | null;
const observe = vi.fn();
const disconnect = vi.fn();
const unobserve = vi.fn();

class FakeIntersectionObserver {
  constructor(cb: IOCallback) {
    lastCallback = cb;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = unobserve;
}

/** Fire an intersection event into the most recently constructed observer. */
function triggerIntersect(isIntersecting: boolean) {
  lastCallback?.([{ isIntersecting }]);
}

beforeEach(() => {
  lastCallback = null;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InfiniteScroll', () => {
  it('observes its sentinel element on mount', () => {
    render(InfiniteScroll, {
      props: { hasMore: true, isLoading: false, onLoadMore: vi.fn() },
    });

    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('calls onLoadMore when the sentinel intersects with more to load and not loading', () => {
    const onLoadMore = vi.fn();
    render(InfiniteScroll, { props: { hasMore: true, isLoading: false, onLoadMore } });

    triggerIntersect(true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onLoadMore when the sentinel is not intersecting', () => {
    const onLoadMore = vi.fn();
    render(InfiniteScroll, { props: { hasMore: true, isLoading: false, onLoadMore } });

    triggerIntersect(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does NOT call onLoadMore when there is nothing more to load', () => {
    const onLoadMore = vi.fn();
    render(InfiniteScroll, { props: { hasMore: false, isLoading: false, onLoadMore } });

    triggerIntersect(true);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does NOT call onLoadMore while already loading', () => {
    const onLoadMore = vi.fn();
    render(InfiniteScroll, { props: { hasMore: true, isLoading: true, onLoadMore } });

    triggerIntersect(true);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('shows the loading indicator only while loading', () => {
    const { container, rerender } = render(InfiniteScroll, {
      props: { hasMore: true, isLoading: false, onLoadMore: vi.fn() },
    });

    // Idle: no bouncing dots.
    expect(container.querySelectorAll('.animate-bounce')).toHaveLength(0);

    return rerender({ hasMore: true, isLoading: true, onLoadMore: vi.fn() }).then(() => {
      expect(container.querySelectorAll('.animate-bounce')).toHaveLength(3);
    });
  });

  it('disconnects the observer on destroy', () => {
    const { unmount } = render(InfiniteScroll, {
      props: { hasMore: true, isLoading: false, onLoadMore: vi.fn() },
    });

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
