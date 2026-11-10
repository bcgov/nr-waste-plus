import { describe, expect, it } from 'vitest';

import SubmissionDetailsForm, { resolveSubmissionVariant } from './index';

describe('SubmissionDetailsForm shim (foundation)', () => {
  it('re-exports resolveSubmissionVariant and component', () => {
    expect(typeof SubmissionDetailsForm).toBe('function');
    expect(resolveSubmissionVariant({ code: 'C', description: 'Coast' })).toBe('coast');
    expect(resolveSubmissionVariant({ code: 'I', description: 'Interior' })).toBe('interior');
  });
});
