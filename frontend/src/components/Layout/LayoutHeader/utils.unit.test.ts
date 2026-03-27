import { describe, expect, it } from 'vitest';

import { getFormattedEnvName } from './utils';

describe('getFormattedEnvName', () => {
  it('returns the substring after the expected prefix - "openshift-" -, in sentence case', () => {
    expect(getFormattedEnvName('openshift-thing')).toBe('Thing');
  });
  it('returns an empty string when the input doesn\'t start with "openshift-"', () => {
    expect(getFormattedEnvName('thing')).toBe('');
  });
});
