import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Suppress flatpickr locale errors in test output
beforeAll(() => {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.stderr.write = ((...args: any[]): boolean => {
    const chunk = args[0];
    const message = typeof chunk === 'string' ? chunk : chunk.toString();
    
    // Filter out flatpickr locale errors
    if (message.includes('flatpickr: invalid locale')) {
      // Suppress this error from stderr
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }
    
    // Pass through all other messages
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return originalStderrWrite(...(args as [any, any?, any?]));
  }) as typeof process.stderr.write;
});

class MockResizeObserver {
  private readonly _cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this._cb = cb;
  }
  observe = vi.fn((_el: Element) => {
    // Provide a minimal ResizeObserverEntry with contentRect to avoid undefined errors
    const entry: Partial<ResizeObserverEntry> = {
      target: _el,
      contentRect: {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: (_el as HTMLElement)?.offsetWidth || 0,
        height: (_el as HTMLElement)?.offsetHeight || 0,
      } as DOMRectReadOnly,
    };
    this._cb([entry as ResizeObserverEntry], this as unknown as ResizeObserver);
  });
  unobserve = vi.fn(() => {});
  disconnect = vi.fn(() => {});
}

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(), // Legacy method
      removeListener: vi.fn(), // Legacy method
      addEventListener: vi.fn(), // Modern method
      removeEventListener: vi.fn(), // Modern method
      dispatchEvent: vi.fn(),
    };
  };

global.ResizeObserver = MockResizeObserver;

Object.defineProperty(global.SVGElement.prototype, 'getScreenCTM', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  writable: true,
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
  }),
});

Object.defineProperty(global.SVGElement.prototype, 'getComputedTextLength', {
  writable: true,
  value: vi.fn().mockReturnValue(220),
});

Object.defineProperty(global.SVGElement.prototype, 'transform', {
  writable: true,
  value: {
    baseVal: {
      consolidate: vi.fn(() => {}),
    },
  },
});

Object.defineProperty(global.SVGElement.prototype, 'createSVGMatrix', {
  writable: true,
  value: vi.fn().mockReturnValue({
    x: 10,
    y: 10,
    inverse: () => {},
    multiply: () => {},
  }),
});

window.HTMLElement.prototype.scrollIntoView = function () {};
