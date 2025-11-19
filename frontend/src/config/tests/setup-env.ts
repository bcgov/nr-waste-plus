// @ts-nocheck
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

class MockResizeObserver {
  private readonly _cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this._cb = cb;
  }
  observe = vi.fn((_el: Element) => {
    // Invoke the callback with an empty entries array to mark usage
    this._cb([], this as unknown as ResizeObserver);
  });
  unobserve = vi.fn((_el: Element) => {});
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
