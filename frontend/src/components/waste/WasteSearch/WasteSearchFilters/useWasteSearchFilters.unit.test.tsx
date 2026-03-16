import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useWasteSearchFilters } from './useWasteSearchFilters';

import type { ReportingUnitSearchParametersViewDto } from '@/services/types';

vi.mock('@/hooks/useSyncFiltersToSearchParams', () => ({
  default: vi.fn(),
}));

vi.mock('@/hooks/useSyncPreferencesToFilters', () => ({
  default: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

const defaultValue: ReportingUnitSearchParametersViewDto = {
  mainSearchTerm: '',
  sampling: [],
  district: [],
  status: [],
};

describe('useWasteSearchFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial filter state from the value prop', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      mainSearchTerm: 'initial',
      sampling: ['A'],
      district: [],
      status: [],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    expect(result.current.filters).toEqual(value);
  });

  it('returns isAdvancedSearchOpen as false initially', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()), { wrapper });

    expect(result.current.isAdvancedSearchOpen).toBe(false);
  });

  it('setIsAdvancedSearchOpen toggles the modal state', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()), { wrapper });

    act(() => {
      result.current.setIsAdvancedSearchOpen(true);
    });

    expect(result.current.isAdvancedSearchOpen).toBe(true);

    act(() => {
      result.current.setIsAdvancedSearchOpen(false);
    });

    expect(result.current.isAdvancedSearchOpen).toBe(false);
  });

  it('handleStringChange updates the specified filter key', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()), { wrapper });

    act(() => {
      result.current.handleStringChange('mainSearchTerm')('search text');
    });

    expect(result.current.filters.mainSearchTerm).toBe('search text');
  });

  it('handleStringChange does not affect other keys', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['S1'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    act(() => {
      result.current.handleStringChange('mainSearchTerm')('new search');
    });

    expect(result.current.filters.sampling).toEqual(['S1']);
  });

  it('handleActiveMultiSelectChange maps selectedItems to codes', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()), { wrapper });

    act(() => {
      result.current.handleActiveMultiSelectChange('sampling')({
        selectedItems: [
          { code: 'A', description: 'Option A' },
          { code: 'B', description: 'Option B' },
        ],
      });
    });

    expect(result.current.filters.sampling).toEqual(['A', 'B']);
  });

  it('handleActiveMultiSelectChange handles empty selection (clear all)', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['A', 'B'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    act(() => {
      result.current.handleActiveMultiSelectChange('sampling')({ selectedItems: [] });
    });

    expect(result.current.filters.sampling).toEqual([]);
  });

  it('handleChange updates the specified key with the given value', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()), { wrapper });

    act(() => {
      result.current.handleChange('district', ['D1', 'D2']);
    });

    expect(result.current.filters.district).toEqual(['D1', 'D2']);
  });

  it('handleChange does not affect other keys', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      mainSearchTerm: 'keep me',
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    act(() => {
      result.current.handleChange('district', ['D1']);
    });

    expect(result.current.filters.mainSearchTerm).toBe('keep me');
  });

  it('onRemoveFilter without value removes the key from filters', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      mainSearchTerm: 'remove me',
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    act(() => {
      result.current.onRemoveFilter('mainSearchTerm', undefined);
    });

    expect(result.current.filters.mainSearchTerm).toBeUndefined();
  });

  it('onRemoveFilter with value removes only that item from an array key', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['A', 'B', 'C'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    act(() => {
      result.current.onRemoveFilter('sampling', 'B');
    });

    expect(result.current.filters.sampling).toEqual(['A', 'C']);
  });

  it('onRemoveFilter with value keeps other array keys untouched', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['A', 'B'],
      district: ['D1'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()), { wrapper });

    act(() => {
      result.current.onRemoveFilter('sampling', 'A');
    });

    expect(result.current.filters.district).toEqual(['D1']);
  });

  it('calls onChange via useEffect when filters change', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, onChange), {
      wrapper,
    });

    // onChange is called once on mount with the initial (empty) state
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    const callCountBefore = onChange.mock.calls.length;

    act(() => {
      result.current.handleStringChange('mainSearchTerm')('hello');
    });

    await waitFor(() => {
      expect(onChange.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  it('passes removeEmpty output to onChange (omits empty arrays)', async () => {
    const onChange = vi.fn();
    renderHook(
      () =>
        useWasteSearchFilters(
          { mainSearchTerm: 'test', sampling: [], district: [], status: [] },
          onChange,
        ),
      { wrapper },
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    // The last call should not contain empty-array keys (removeEmpty strips them)
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.sampling).toBeUndefined();
    expect(lastCall.district).toBeUndefined();
    expect(lastCall.status).toBeUndefined();
    expect(lastCall.mainSearchTerm).toBe('test');
  });

  it('returns all required handler functions', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()), { wrapper });

    expect(typeof result.current.handleStringChange).toBe('function');
    expect(typeof result.current.handleActiveMultiSelectChange).toBe('function');
    expect(typeof result.current.handleChange).toBe('function');
    expect(typeof result.current.onRemoveFilter).toBe('function');
    expect(typeof result.current.setIsAdvancedSearchOpen).toBe('function');
  });
});
