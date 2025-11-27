import { renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import useSyncPreferencesToFilters from './index';

import type { UserPreference } from '@/context/preference/types';

type Filters = {
  clientNumbers?: string[];
  district?: string;
  foo?: string;
};

let mockedPreference: UserPreference = { theme: 'g10', selectedDistrict: '', selectedClient: '' };
const mockUpdatePreferences = vi.fn();

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: () => ({
    userPreference: mockedPreference,
    updatePreferences: mockUpdatePreferences,
  }),
}));

describe('useSyncPreferencesToFilters', () => {
  beforeEach(() => {
    mockedPreference = { theme: 'g10', selectedDistrict: '', selectedClient: '' };
    mockUpdatePreferences.mockClear();
  });

  it('syncs mapped preference to filter with transform', () => {
    mockedPreference = { ...mockedPreference, selectedClient: 'abc' };
    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(
        setFilters,
        { selectedClient: 'clientNumbers' },
        (key, value): string | string[] | undefined =>
          key === 'selectedClient' ? [value as string] : (value as string | string[] | undefined),
      );
      return filters;
    });
    expect(result.current.clientNumbers).toEqual(['abc']);
  });

  it('syncs mapped preference to filter without transform', () => {
    mockedPreference = { ...mockedPreference, selectedDistrict: 'd1' };
    const { result } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(setFilters, { selectedDistrict: 'district' });
      return filters;
    });
    expect(result.current.district).toBe('d1');
  });

  it('updates filter when preference changes', () => {
    mockedPreference = { ...mockedPreference, fooPref: 'bar' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(setFilters, { fooPref: 'foo' });
      return filters;
    });
    expect(result.current.foo).toBe('bar');
    // Change preference
    mockedPreference = { ...mockedPreference, fooPref: 'baz' };
    rerender();
    expect(result.current.foo).toBe('baz');
  });
});
