import { describe, expect, it } from 'vitest';

import { resolveSubmissionVariant } from './resolveSubmissionVariant';

describe('resolveSubmissionVariant', () => {
  it('resolves coast from description (case/whitespace-insensitive)', () => {
    expect(resolveSubmissionVariant({ code: 'C', description: 'Coast' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: 'C', description: '  coast  ' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: 'X', description: 'COASTAL' })).toBe('coast');
  });

  it('resolves coast from COASTAL grade code (legacy/fallback shape)', () => {
    expect(resolveSubmissionVariant({ code: 'COASTAL', description: 'COASTAL' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: ' coastal ', description: 'Legacy' })).toBe('coast');
  });

  it('falls back to interior for other, missing, or null grades', () => {
    expect(resolveSubmissionVariant({ code: 'I', description: 'Interior' })).toBe('interior');
    expect(resolveSubmissionVariant({ code: null, description: null })).toBe('interior');
    expect(resolveSubmissionVariant(null)).toBe('interior');
    expect(resolveSubmissionVariant(undefined)).toBe('interior');
  });
});
