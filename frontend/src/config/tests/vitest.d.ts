import type { MatcherFunction } from 'expect';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeEmptyDOMElement(): void;
    toContainText(expected: string): void;
  }

  interface AsymmetricMatchersContaining {
    toBeEmptyDOMElement(): void;
    toContainText(expected: string): void;
  }
}
