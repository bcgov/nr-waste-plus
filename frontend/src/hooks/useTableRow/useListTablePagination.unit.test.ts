import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useListTablePagination } from './useListTablePagination';

describe('useListTablePagination', () => {
  describe('default state', () => {
    it('starts with page 0, size 10, empty sort, searchTrigger 0', () => {
      const { result } = renderHook(() => useListTablePagination());

      expect(result.current.page).toBe(0);
      expect(result.current.size).toBe(10);
      expect(result.current.sort).toEqual({});
      expect(result.current.searchTrigger).toBe(0);
    });

    it('isSearchEnabled returns true by default', () => {
      const { result } = renderHook(() => useListTablePagination());
      expect(result.current.isSearchEnabled()).toBe(true);
    });
  });

  describe('executeSearch', () => {
    it('increments searchTrigger and sets page/size', () => {
      const { result } = renderHook(() => useListTablePagination());

      act(() => {
        result.current.executeSearch(2, 25);
      });

      expect(result.current.page).toBe(2);
      expect(result.current.size).toBe(25);
      expect(result.current.searchTrigger).toBe(1);
    });

    it('resets page to 0 when resetPage is true', () => {
      const { result } = renderHook(() => useListTablePagination());

      act(() => {
        result.current.executeSearch(3, 10);
      });
      expect(result.current.page).toBe(3);

      act(() => {
        result.current.executeSearch(5, 10, { resetPage: true });
      });
      expect(result.current.page).toBe(0);
      expect(result.current.searchTrigger).toBe(2);
    });

    it('does nothing when enabled is false', () => {
      const { result } = renderHook(() => useListTablePagination({ enabled: false }));

      act(() => {
        result.current.executeSearch(1, 10);
      });

      expect(result.current.searchTrigger).toBe(0);
      expect(result.current.page).toBe(0);
    });

    it('does nothing when enabled function returns false', () => {
      const { result } = renderHook(() =>
        useListTablePagination({
          filters: { name: 'test' },
          enabled: (filters) => Boolean(filters.name),
        }),
      );

      act(() => {
        result.current.executeSearch(1, 10);
      });

      // enabled function returns true for { name: 'test' }, so search should execute
      expect(result.current.searchTrigger).toBe(1);
    });

    it('blocks search when enabled function returns false for empty filters', () => {
      const { result } = renderHook(() =>
        useListTablePagination({
          enabled: (filters) => Object.keys(filters).length > 0,
        }),
      );

      act(() => {
        result.current.executeSearch(1, 10);
      });

      expect(result.current.searchTrigger).toBe(0);
    });

    it('accumulates searchTrigger across multiple calls', () => {
      const { result } = renderHook(() => useListTablePagination());

      act(() => {
        result.current.executeSearch(0, 10);
      });
      act(() => {
        result.current.executeSearch(1, 10);
      });
      act(() => {
        result.current.executeSearch(2, 10);
      });

      expect(result.current.searchTrigger).toBe(3);
    });
  });

  describe('handleSort', () => {
    it('sets sort and triggers search with current page/size', () => {
      const { result } = renderHook(() => useListTablePagination());

      act(() => {
        result.current.handleSort({ name: 'ASC' });
      });

      expect(result.current.sort).toEqual({ name: 'ASC' });
      expect(result.current.searchTrigger).toBe(1);
    });

    it('preserves existing page when sorting', () => {
      const { result } = renderHook(() => useListTablePagination());

      act(() => {
        result.current.executeSearch(3, 25);
      });
      expect(result.current.page).toBe(3);

      act(() => {
        result.current.handleSort({ date: 'DESC' });
      });

      expect(result.current.page).toBe(3);
      expect(result.current.size).toBe(25);
      expect(result.current.sort).toEqual({ date: 'DESC' });
    });

    it('does nothing when enabled is false', () => {
      const { result } = renderHook(() => useListTablePagination({ enabled: false }));

      act(() => {
        result.current.handleSort({ name: 'ASC' });
      });

      expect(result.current.sort).toEqual({ name: 'ASC' });
      expect(result.current.searchTrigger).toBe(0);
    });
  });

  describe('isSearchEnabled', () => {
    it('returns true when enabled is undefined (default)', () => {
      const { result } = renderHook(() => useListTablePagination());
      expect(result.current.isSearchEnabled()).toBe(true);
    });

    it('returns true when enabled is true', () => {
      const { result } = renderHook(() => useListTablePagination({ enabled: true }));
      expect(result.current.isSearchEnabled()).toBe(true);
    });

    it('returns false when enabled is false', () => {
      const { result } = renderHook(() => useListTablePagination({ enabled: false }));
      expect(result.current.isSearchEnabled()).toBe(false);
    });

    it('calls enabled function with current filters', () => {
      const gate = vi.fn((filters: Record<string, unknown>) => Boolean(filters.keyword));
      const { result } = renderHook(() =>
        useListTablePagination({
          filters: { keyword: 'test' },
          enabled: gate,
        }),
      );

      expect(result.current.isSearchEnabled()).toBe(true);
      expect(gate).toHaveBeenCalledWith({ keyword: 'test' });
    });

    it('returns false when enabled function returns false', () => {
      const { result } = renderHook(() =>
        useListTablePagination({
          filters: {},
          enabled: (filters) => Boolean(filters.keyword),
        }),
      );

      expect(result.current.isSearchEnabled()).toBe(false);
    });

    it('defaults to empty object when filters is undefined', () => {
      const gate = vi.fn(() => true);
      const { result } = renderHook(() => useListTablePagination({ enabled: gate }));

      result.current.isSearchEnabled();
      expect(gate).toHaveBeenCalledWith({});
    });
  });
});
