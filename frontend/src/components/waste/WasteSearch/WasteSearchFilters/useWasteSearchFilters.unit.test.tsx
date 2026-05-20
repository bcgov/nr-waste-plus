import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useWasteSearchFilters } from './useWasteSearchFilters';

import type { ReportingUnitSearchParametersViewDto } from '@/services/types';

import useSyncPreferencesToFilters from '@/hooks/useSyncPreferencesToFilters';

vi.mock('@/hooks/useSyncFiltersToSearchParams', () => ({
  default: vi.fn(),
}));

vi.mock('@/hooks/useSyncPreferencesToFilters', () => ({
  default: vi.fn(),
}));

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

  it('shouldReturnInitialFilterState_whenValuePropProvided', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      mainSearchTerm: 'initial',
      sampling: ['A'],
      district: [],
      status: [],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    expect(result.current.filters).toEqual(value);
  });

  it('shouldReturnFalseForIsAdvancedSearchOpen_whenInitialized', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));

    expect(result.current.isAdvancedSearchOpen).toBe(false);
  });

  it('shouldToggleModalState_whenSetIsAdvancedSearchOpenCalled', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));

    act(() => {
      result.current.setIsAdvancedSearchOpen(true);
    });

    expect(result.current.isAdvancedSearchOpen).toBe(true);

    act(() => {
      result.current.setIsAdvancedSearchOpen(false);
    });

    expect(result.current.isAdvancedSearchOpen).toBe(false);
  });

  it('shouldUpdateFilterKey_whenHandleStringChangeCalled', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));

    act(() => {
      result.current.handleStringChange('mainSearchTerm')('search text');
    });

    expect(result.current.filters.mainSearchTerm).toBe('search text');
  });

  it('shouldNotAffectOtherKeys_whenHandleStringChangeCalled', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['S1'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    act(() => {
      result.current.handleStringChange('mainSearchTerm')('new search');
    });

    expect(result.current.filters.sampling).toEqual(['S1']);
  });

  it('shouldMapSelectedItemsToCodes_whenHandleActiveMultiSelectChangeCalled', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));

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

  it('shouldClearArrayKey_whenHandleActiveMultiSelectChangeWithEmptySelection', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['A', 'B'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    act(() => {
      result.current.handleActiveMultiSelectChange('sampling')({ selectedItems: [] });
    });

    expect(result.current.filters.sampling).toEqual([]);
  });

  it('shouldUpdateSpecifiedKey_whenHandleChangeCalled', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));

    act(() => {
      result.current.handleChange('district')(['D1', 'D2']);
    });

    expect(result.current.filters.district).toEqual(['D1', 'D2']);
  });

  it('shouldNotAffectOtherKeys_whenHandleChangeCalled', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      mainSearchTerm: 'keep me',
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    act(() => {
      result.current.handleChange('district')(['D1']);
    });

    expect(result.current.filters.mainSearchTerm).toBe('keep me');
  });

  it('shouldRemoveKey_whenOnRemoveFilterCalledWithoutValue', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      mainSearchTerm: 'remove me',
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    act(() => {
      result.current.onRemoveFilter('mainSearchTerm', undefined);
    });

    expect(result.current.filters.mainSearchTerm).toBeUndefined();
  });

  it('shouldRemoveOnlySpecifiedItem_whenOnRemoveFilterCalledWithValue', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['A', 'B', 'C'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    act(() => {
      result.current.onRemoveFilter('sampling', 'B');
    });

    expect(result.current.filters.sampling).toEqual(['A', 'C']);
  });

  it('shouldKeepOtherKeys_whenOnRemoveFilterCalled', () => {
    const value: ReportingUnitSearchParametersViewDto = {
      ...defaultValue,
      sampling: ['A', 'B'],
      district: ['D1'],
    };
    const { result } = renderHook(() => useWasteSearchFilters(value, vi.fn()));

    act(() => {
      result.current.onRemoveFilter('sampling', 'A');
    });

    expect(result.current.filters.district).toEqual(['D1']);
  });

  it('shouldCallOnChange_whenFiltersChange', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, onChange));

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

  it('shouldOmitEmptyArraysInOnChangeOutput_whenFiltersContainEmptyArrays', async () => {
    const onChange = vi.fn();
    renderHook(() =>
      useWasteSearchFilters(
        { mainSearchTerm: 'test', sampling: [], district: [], status: [] },
        onChange,
      ),
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

  it('shouldReturnAllHandlerFunctions_whenInitialized', () => {
    const { result } = renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));

    expect(typeof result.current.handleStringChange).toBe('function');
    expect(typeof result.current.handleActiveMultiSelectChange).toBe('function');
    expect(typeof result.current.handleChange).toBe('function');
    expect(typeof result.current.onRemoveFilter).toBe('function');
    expect(typeof result.current.setIsAdvancedSearchOpen).toBe('function');
  });

  describe('useSyncPreferencesToFilters callback', () => {
    it('shouldReturnValueAsArray_whenKeyIsSelectedClient', () => {
      renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));
      // Extract the transform callback passed to useSyncPreferencesToFilters
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const transformFn = calls[0][2]!;
      expect(transformFn('selectedClient', '100')).toEqual(['100']);
    });

    it('shouldReturnEmptyArray_whenKeyIsSelectedClientAndValueIsFalsy', () => {
      renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      expect(transformFn('selectedClient', '')).toEqual([]);
    });

    it('shouldReturnValueAsArray_whenKeyIsSelectedDistrict', () => {
      renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      expect(transformFn('selectedDistrict', 'DT01')).toEqual(['DT01']);
    });

    it('shouldReturnValuePassthrough_whenKeyIsUnknown', () => {
      renderHook(() => useWasteSearchFilters(defaultValue, vi.fn()));
      const calls = vi.mocked(useSyncPreferencesToFilters).mock.calls;
      const transformFn = calls[0][2]!;
      expect(transformFn('someOtherKey' as never, 'raw-value')).toBe('raw-value');
    });
  });
});
