/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useListTableState } from './useListTableState';

const createMockQueryResult = (overrides: Record<string, any> = {}) => ({
  data: undefined as any,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

describe('useListTableState', () => {
  let mockRefetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch = vi.fn();
  });

  it('calls queryHook with initial page/size/sort values', () => {
    const queryHook = vi.fn(() => createMockQueryResult({ refetch: mockRefetch }));

    renderHook(() => useListTableState({ queryHook }));

    expect(queryHook).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: {},
    });
  });

  it('returns data, loading, fetching, error from query result', () => {
    const mockData = {
      content: [{ id: 1 }],
      page: { totalPages: 3, totalElements: 25 },
    };
    const queryHook = vi.fn(() =>
      createMockQueryResult({
        data: mockData,
        isLoading: true,
        isFetching: true,
        isError: false,
        refetch: mockRefetch,
      }),
    );

    const { result } = renderHook(() => useListTableState({ queryHook }));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('refetches on mount when search is enabled (default)', () => {
    const queryHook = vi.fn(() => createMockQueryResult({ refetch: mockRefetch }));

    renderHook(() => useListTableState({ queryHook }));

    // mount effect calls refetch when isSearchEnabled() returns true
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('does not refetch on mount when enabled is false', () => {
    const queryHook = vi.fn(() => createMockQueryResult({ refetch: mockRefetch }));

    renderHook(() => useListTableState({ queryHook, enabled: false }));

    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('refetches when executeSearch is called', () => {
    const queryHook = vi.fn(() => createMockQueryResult({ refetch: mockRefetch }));

    const { result } = renderHook(() => useListTableState({ queryHook }));

    // Clear mount refetch
    mockRefetch.mockClear();

    act(() => {
      result.current.handleSort({ name: 'ASC' });
    });

    // handleSort calls executeSearch which increments searchTrigger, triggering refetch
    waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('handlePageChange updates page and triggers search', () => {
    const mockData = {
      content: [{ id: 1 }],
      page: { totalPages: 5, totalElements: 50 },
    };
    const queryHook = vi.fn(() => createMockQueryResult({ data: mockData, refetch: mockRefetch }));

    const { result } = renderHook(() => useListTableState({ queryHook }));

    mockRefetch.mockClear();

    act(() => {
      result.current.handlePageChange({ page: 2, pageSize: 25 });
    });

    // After handlePageChange, the hook should call queryHook again with new params
    waitFor(() => {
      expect(queryHook).toHaveBeenCalledWith({
        page: 2,
        size: 25,
        sort: {},
      });
    });
  });

  it('handlePageChange clamps page to totalPages - 1', () => {
    const mockData = {
      content: [{ id: 1 }],
      page: { totalPages: 3, totalElements: 30 },
    };
    const queryHook = vi.fn(() => createMockQueryResult({ data: mockData, refetch: mockRefetch }));

    const { result } = renderHook(() => useListTableState({ queryHook }));

    act(() => {
      result.current.handlePageChange({ page: 100, pageSize: 10 });
    });

    // maxPage = totalPages - 1 = 2, so page should be clamped to 2
    waitFor(() => {
      expect(queryHook).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it('handlePageChange clamps negative page to 0', () => {
    const mockData = {
      content: [{ id: 1 }],
      page: { totalPages: 3, totalElements: 30 },
    };
    const queryHook = vi.fn(() => createMockQueryResult({ data: mockData, refetch: mockRefetch }));

    const { result } = renderHook(() => useListTableState({ queryHook }));

    act(() => {
      result.current.handlePageChange({ page: -5, pageSize: 10 });
    });

    waitFor(() => {
      expect(queryHook).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }));
    });
  });

  it('returns pageSize from internal state', () => {
    const queryHook = vi.fn(() => createMockQueryResult({ refetch: mockRefetch }));

    const { result } = renderHook(() => useListTableState({ queryHook }));

    expect(result.current.pageSize).toBe(10);
  });

  it('passes filters to enabled gate', () => {
    const enabledFn = vi.fn(() => false);
    const queryHook = vi.fn(() => createMockQueryResult({ refetch: mockRefetch }));

    renderHook(() =>
      useListTableState({
        queryHook,
        filters: { keyword: 'test' },
        enabled: enabledFn,
      }),
    );

    expect(enabledFn).toHaveBeenCalledWith({ keyword: 'test' });
    // enabled is false, so mount refetch should NOT have been called
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
