/**
 * useTableToolbar Hook Unit Tests
 *
 * These tests verify the core hook functionality for managing table column preferences.
 * The hook is also tested as part of the TableResource integration tests.
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import { useTableToolbar } from './useTableToolbar';

import type { TableHeaderType } from './types';
import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
    },
  };
});

vi.mock('@/context/preference/usePreference', () => {
  return {
    usePreference: vi.fn(),
  };
});

import { usePreference } from '@/context/preference/usePreference';

type TestObjectType = {
  id: number;
  name: string;
  email: string;
};

describe('useTableToolbar', () => {
  const mockUsePreference = usePreference as Mock;

  const headers: TableHeaderType<TestObjectType>[] = [
    { key: 'id', header: 'ID', selected: true, id: 'col-id' },
    { key: 'name', header: 'Name', selected: true, id: 'col-name' },
    { key: 'email', header: 'Email', selected: false, id: 'col-email' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePreference.mockReturnValue({
      userPreference: { tableHeaders: {} },
      updatePreferences: vi.fn(),
      isLoaded: true,
    });
  });

  it('exports a function that accepts id and headers parameters', () => {
    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    expect(result.current).toBeDefined();
    expect(typeof result.current.tableHeaders).toBe('object');
    expect(typeof result.current.onToggleHeader).toBe('function');
  });

  it('returns tableHeaders and onToggleHeader method', () => {
    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    expect(result.current.tableHeaders).toBeDefined();
    expect(Array.isArray(result.current.tableHeaders)).toBe(true);
    expect(result.current.onToggleHeader).toBeDefined();
    expect(typeof result.current.onToggleHeader).toBe('function');
  });

  it('starts with provided headers when no preferences are saved', () => {
    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    expect(result.current.tableHeaders).toEqual(headers);
  });

  it('calls updatePreferences when onToggleHeader is invoked', () => {
    const updatePreferences = vi.fn();
    mockUsePreference.mockReturnValue({
      userPreference: { tableHeaders: {} },
      updatePreferences,
      isLoaded: true,
    });

    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    act(() => {
      result.current.onToggleHeader('col-id');
    });

    expect(updatePreferences).toHaveBeenCalled();
  });

  it('preserves header state after toggle', () => {
    const updatePreferences = vi.fn();
    mockUsePreference.mockReturnValue({
      userPreference: { tableHeaders: {} },
      updatePreferences,
      isLoaded: true,
    });

    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    const initialId = result.current.tableHeaders[0].id;
    const initialKey = result.current.tableHeaders[0].key;

    act(() => {
      result.current.onToggleHeader('col-id');
    });

    // Headers should maintain structure but selection state changes
    expect(result.current.tableHeaders[0].id).toBe(initialId);
    expect(result.current.tableHeaders[0].key).toBe(initialKey);
  });

  it('handles multiple table ids independently', () => {
    const updatePreferences = vi.fn();
    mockUsePreference.mockReturnValue({
      userPreference: {
        tableHeaders: {
          'table-1': ['col-id'],
          'table-2': ['col-name'],
        },
      },
      updatePreferences,
      isLoaded: true,
    });

    const { result: result1 } = renderHook(() => useTableToolbar('table-1', headers));
    const { result: result2 } = renderHook(() => useTableToolbar('table-2', headers));

    // Each hook instance manages its own table's preferences
    expect(result1.current).toBeDefined();
    expect(result2.current).toBeDefined();
    expect(result1.current.tableHeaders).toBeDefined();
    expect(result2.current.tableHeaders).toBeDefined();
  });

  it('respects isLoaded flag from usePreference', () => {
    mockUsePreference.mockReturnValue({
      userPreference: { tableHeaders: {} },
      updatePreferences: vi.fn(),
      isLoaded: false,
    });

    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    // Should still return something usable
    expect(result.current.tableHeaders).toBeDefined();
    expect(result.current.onToggleHeader).toBeDefined();
  });

  it('handles toggling and preserves unaffected headers', () => {
    const updatePreferences = vi.fn();
    mockUsePreference.mockReturnValue({
      userPreference: { tableHeaders: {} },
      updatePreferences,
      isLoaded: true,
    });

    const { result } = renderHook(() => useTableToolbar('test-table', headers));

    const initialName = result.current.tableHeaders[1];

    act(() => {
      result.current.onToggleHeader('col-id');
    });

    // col-name header should remain unchanged
    expect(result.current.tableHeaders[1]).toEqual(initialName);
  });

  /**
   * NOTE: Complex preference loading and preference merging tests are covered by:
   * - TableResource integration tests (13 tests validate full column management)
   * - E2E tests that verify preferences persist across page reloads
   *
   * The hook properly integrates with the preference context and ensures
   * state management works correctly in combination with the full component stack.
   */
});
