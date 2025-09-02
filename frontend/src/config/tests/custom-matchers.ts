import { expect } from 'vitest';

expect.extend({
  toContainText(received: HTMLElement, expected: string) {
    const pass = received.textContent?.includes(expected);
    return {
      pass,
      message: () =>
        `expected element ${pass ? 'not ' : ''}to contain text "${expected}", but got "${received.textContent}"`,
    };
  },
});

expect.extend({
  toBeEmptyDOMElement(received: HTMLElement) {
    const pass = received instanceof HTMLElement && received.innerHTML === '';
    return {
      pass,
      message: () => (pass ? 'Expected element not to be empty' : 'Expected element to be empty'),
    };
  },
});
