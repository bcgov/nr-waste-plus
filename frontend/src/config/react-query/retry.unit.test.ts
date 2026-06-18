import { describe, expect, it } from 'vitest';

import { noRetry } from './retry';

describe('noRetry', () => {
  it('should always return false', () => {
    expect(noRetry(0, new Error('fail'))).toBe(false);
    expect(noRetry(1, new Error('fail'))).toBe(false);
    expect(noRetry(3, 'string error')).toBe(false);
    expect(noRetry(100, null)).toBe(false);
  });
});
