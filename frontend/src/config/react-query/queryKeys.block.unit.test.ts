import { describe, expect, it } from 'vitest';

import { queryClient } from './config';
import { queryKeys } from './queryKeys';

describe('block query keys', () => {
  it('shouldUseAStableCreateKey', () => {
    expect(queryKeys.block.create()).toEqual(['block', 'create']);
  });

  it('shouldScopeListKeyToItsReportingUnit', () => {
    expect(queryKeys.block.list(468)).toEqual(['block', 'list', 468]);
    expect(queryKeys.block.list(469)).not.toEqual(queryKeys.block.list(468));
  });

  it('shouldReturnIndependentListKeysForDifferentReportingUnits', () => {
    const first = queryKeys.block.list(468);
    const second = queryKeys.block.list(469);

    expect(first[2]).toBe(468);
    expect(second[2]).toBe(469);
    expect(first).not.toBe(second);
  });

  it('shouldKeepBlockListCacheEntriesSeparateAcrossReportingUnits', () => {
    const firstKey = queryKeys.block.list(468);
    const secondKey = queryKeys.block.list(469);
    queryClient.setQueryData(firstKey, { page: { totalElements: 1 } });
    queryClient.setQueryData(secondKey, { page: { totalElements: 3 } });

    expect(queryClient.getQueryData(firstKey)).toEqual({ page: { totalElements: 1 } });
    expect(queryClient.getQueryData(secondKey)).toEqual({ page: { totalElements: 3 } });

    queryClient.removeQueries({ queryKey: firstKey });
    queryClient.removeQueries({ queryKey: secondKey });
  });
});
