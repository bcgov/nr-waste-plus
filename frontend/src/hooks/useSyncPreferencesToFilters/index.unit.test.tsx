import { renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import useSyncPreferencesToFilters from './index';

import type { UserPreference } from '@/context/preference/types';

type Filters = {
  clientNumbers?: string[];
  district?: string;
  foo?: string;
  bar?: string;
};

let mockedPreference: UserPreference = { theme: 'g10' };
const mockUpdatePreferences = vi.fn();

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: () => ({
    userPreference: mockedPreference,
    updatePreferences: mockUpdatePreferences,
  }),
}));

describe('useSyncPreferencesToFilters', () => {
  beforeEach(() => {
    mockedPreference = { theme: 'g10' };
    mockUpdatePreferences.mockClear();
  });

  it('does not sync on initial mount', () => {
    mockedPreference = { theme: 'g10', selectedClient: 'abc' };
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
    // On initial mount, filters should remain empty (no sync)
    expect(result.current.clientNumbers).toBeUndefined();
  });

  it('syncs mapped preference to filter with transform when preference changes', () => {
    mockedPreference = { theme: 'g10', selectedClient: 'abc' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(
        setFilters,
        { selectedClient: 'clientNumbers' },
        (key, value): string | string[] | undefined =>
          key === 'selectedClient' ? [value as string] : (value as string | string[] | undefined),
      );
      return filters;
    });
    // Initial mount - no sync
    expect(result.current.clientNumbers).toBeUndefined();

    // Change preference - should sync
    mockedPreference = { ...mockedPreference, selectedClient: 'xyz' };
    rerender();
    expect(result.current.clientNumbers).toEqual(['xyz']);
  });

  it('syncs mapped preference to filter without transform when preference changes', () => {
    mockedPreference = { theme: 'g10', selectedDistrict: 'd1' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(setFilters, { selectedDistrict: 'district' });
      return filters;
    });
    // Initial mount - no sync
    expect(result.current.district).toBeUndefined();

    // Change preference - should sync
    mockedPreference = { ...mockedPreference, selectedDistrict: 'd2' };
    rerender();
    expect(result.current.district).toBe('d2');
  });

  it('updates filter when preference changes from value to different value', () => {
    mockedPreference = { theme: 'g10', fooPref: 'bar' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(setFilters, { fooPref: 'foo' });
      return filters;
    });
    // Initial mount - no sync
    expect(result.current.foo).toBeUndefined();

    // Change preference - should sync
    mockedPreference = { ...mockedPreference, fooPref: 'baz' };
    rerender();
    expect(result.current.foo).toBe('baz');

    // Change again
    mockedPreference = { ...mockedPreference, fooPref: 'qux' };
    rerender();
    expect(result.current.foo).toBe('qux');
  });

  it('does not update filter when untracked preferences change', () => {
    mockedPreference = { theme: 'g10', selectedClient: 'abc' };
    const setFiltersSpy = vi.fn();
    const { rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      const wrappedSetFilters = (update: React.SetStateAction<Filters>) => {
        setFiltersSpy(update);
        setFilters(update);
      };
      useSyncPreferencesToFilters(
        wrappedSetFilters,
        { selectedClient: 'clientNumbers' },
        (key, value): string | string[] | undefined =>
          key === 'selectedClient' ? [value as string] : (value as string | string[] | undefined),
      );
      return filters;
    });

    // Clear the spy after initial mount
    setFiltersSpy.mockClear();

    // Change only theme (untracked) - should NOT trigger setFilters
    mockedPreference = { ...mockedPreference, theme: 'g90' };
    rerender();
    expect(setFiltersSpy).not.toHaveBeenCalled();
  });

  it('does not update filter when tracked preference changes to null', () => {
    mockedPreference = { theme: 'g10', fooPref: 'bar' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ foo: 'initial' });
      useSyncPreferencesToFilters(setFilters, { fooPref: 'foo' });
      return filters;
    });

    // Initial state
    expect(result.current.foo).toBe('initial');

    // Change preference to null - filter should remain unchanged
    mockedPreference = { ...mockedPreference, fooPref: null };
    rerender();
    expect(result.current.foo).toBe('initial');
  });

  it('does not update filter when tracked preference changes to undefined', () => {
    mockedPreference = { theme: 'g10', fooPref: 'bar' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ foo: 'initial' });
      useSyncPreferencesToFilters(setFilters, { fooPref: 'foo' });
      return filters;
    });

    // Initial state
    expect(result.current.foo).toBe('initial');

    // Change preference to undefined - filter should remain unchanged
    mockedPreference = { ...mockedPreference, fooPref: undefined };
    rerender();
    expect(result.current.foo).toBe('initial');
  });

  it('updates filter when tracked preference changes from value to empty string', () => {
    mockedPreference = { theme: 'g10', fooPref: 'bar' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(setFilters, { fooPref: 'foo' });
      return filters;
    });

    // Initial mount - no sync
    expect(result.current.foo).toBeUndefined();

    // Change to empty string - should update
    mockedPreference = { ...mockedPreference, fooPref: '' };
    rerender();
    expect(result.current.foo).toBe('');
  });

  it('updates filter when tracked preference changes from empty string to value', () => {
    mockedPreference = { theme: 'g10', fooPref: '' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(setFilters, { fooPref: 'foo' });
      return filters;
    });

    // Initial mount - no sync
    expect(result.current.foo).toBeUndefined();

    // Change from empty string to value - should update
    mockedPreference = { ...mockedPreference, fooPref: 'newValue' };
    rerender();
    expect(result.current.foo).toBe('newValue');
  });

  it('preserves untracked filter values when tracked preferences update', () => {
    mockedPreference = { theme: 'g10', selectedDistrict: 'd1' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({ foo: 'manually-set', bar: 'also-manual' });
      useSyncPreferencesToFilters(setFilters, { selectedDistrict: 'district' });
      return filters;
    });

    // Initial state - untracked values present
    expect(result.current.foo).toBe('manually-set');
    expect(result.current.bar).toBe('also-manual');
    expect(result.current.district).toBeUndefined();

    // Update tracked preference
    mockedPreference = { ...mockedPreference, selectedDistrict: 'd2' };
    rerender();

    // Untracked values should remain, tracked value should update
    expect(result.current.foo).toBe('manually-set');
    expect(result.current.bar).toBe('also-manual');
    expect(result.current.district).toBe('d2');
  });

  it('does not call setFilters when tracked preference value remains the same', () => {
    mockedPreference = { theme: 'g10', fooPref: 'bar' };
    const setFiltersSpy = vi.fn();
    const { rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      const wrappedSetFilters = (update: React.SetStateAction<Filters>) => {
        setFiltersSpy(update);
        setFilters(update);
      };
      useSyncPreferencesToFilters(wrappedSetFilters, { fooPref: 'foo' });
      return filters;
    });

    // Clear spy after initial mount
    setFiltersSpy.mockClear();

    // Rerender with same preference value - should NOT trigger setFilters
    rerender();
    expect(setFiltersSpy).not.toHaveBeenCalled();
  });

  it('handles multiple tracked preferences changing simultaneously', () => {
    mockedPreference = { theme: 'g10', selectedClient: 'abc', selectedDistrict: 'd1' };
    const { result, rerender } = renderHook(() => {
      const [filters, setFilters] = useState<Filters>({});
      useSyncPreferencesToFilters(
        setFilters,
        { selectedClient: 'clientNumbers', selectedDistrict: 'district' },
        (key, value): string | string[] | undefined => {
          if (key === 'selectedClient') {
            return value ? [value as string] : [];
          }
          return value as string | string[] | undefined;
        },
      );
      return filters;
    });

    // Initial mount - no sync
    expect(result.current.clientNumbers).toBeUndefined();
    expect(result.current.district).toBeUndefined();

    // Change both preferences
    mockedPreference = { ...mockedPreference, selectedClient: 'xyz', selectedDistrict: 'd2' };
    rerender();

    // Both should update
    expect(result.current.clientNumbers).toEqual(['xyz']);
    expect(result.current.district).toBe('d2');
  });
});
