/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockNavigateInTree = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: (...args: any[]) => mockNavigateInTree(...args),
}));

vi.mock('@/utils/businessDate', () => ({
  isFutureDated: vi.fn(),
}));

import { useListTableRowActions } from './useListTableRowActions';

import { isFutureDated } from '@/utils/businessDate';

const mockIsFutureDated = vi.mocked(isFutureDated);

type TestRow = { id: string; startDate: string; endDate: string | null };

interface TestConfig {
  configType: string;
  routePath: string;
  onDeleteClick: (row: TestRow) => void;
  getStartDate: (row: TestRow) => string;
  deleteActionLabel: string;
  canDelete?: (row: TestRow) => boolean;
}

const defaultConfig: TestConfig = {
  configType: 'district-volume',
  routePath: '/configuration/district-volume-tables/{id}',
  onDeleteClick: vi.fn(),
  getStartDate: (row) => row.startDate,
  deleteActionLabel: 'district average volume entry',
};

const makeRow = (overrides: Partial<TestRow> = {}): TestRow => ({
  id: 'row-1',
  startDate: '2027-01-01',
  endDate: null,
  ...overrides,
});

describe('useListTableRowActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('view-details action', () => {
    it('always includes view-details action', () => {
      mockIsFutureDated.mockReturnValue(false);

      const { result } = renderHook(() => useListTableRowActions(defaultConfig));

      const row = makeRow();
      const actions = result.current(row);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('view-details');
      expect(actions[0].label).toBe('See details');
    });

    it('navigates to the correct path on click', () => {
      mockIsFutureDated.mockReturnValue(false);

      const { result } = renderHook(() => useListTableRowActions(defaultConfig));

      const row = makeRow({ id: 'row-42' });
      const actions = result.current(row);

      act(() => {
        actions[0].onClick(row as any);
      });

      expect(mockNavigateInTree).toHaveBeenCalledWith(
        mockNavigate,
        '/configuration/district-volume-tables/row-42',
      );
    });
  });

  describe('delete action', () => {
    it('includes delete action for future-dated row without endDate', () => {
      mockIsFutureDated.mockReturnValue(true);

      const { result } = renderHook(() => useListTableRowActions(defaultConfig));

      const row = makeRow({ endDate: null });
      const actions = result.current(row);

      expect(actions).toHaveLength(2);
      expect(actions[1].id).toBe('delete');
      expect(actions[1].label).toBe('Delete district average volume entry');
    });

    it('omits delete action for past-dated row', () => {
      mockIsFutureDated.mockReturnValue(false);

      const { result } = renderHook(() => useListTableRowActions(defaultConfig));

      const row = makeRow();
      const actions = result.current(row);

      expect(actions).toHaveLength(1);
    });

    it('omits delete action for future-dated row with endDate', () => {
      mockIsFutureDated.mockReturnValue(true);

      const { result } = renderHook(() => useListTableRowActions(defaultConfig));

      const row = makeRow({ endDate: '2027-06-01' });
      const actions = result.current(row);

      expect(actions).toHaveLength(1);
    });

    it('calls onDeleteClick on delete action click', () => {
      mockIsFutureDated.mockReturnValue(true);
      const onDeleteClick = vi.fn();

      const { result } = renderHook(() =>
        useListTableRowActions({ ...defaultConfig, onDeleteClick }),
      );

      const row = makeRow();
      const actions = result.current(row);

      act(() => {
        actions[1].onClick(row as any);
      });

      expect(onDeleteClick).toHaveBeenCalledWith(row);
    });

    it('omits delete when canDelete returns false', () => {
      mockIsFutureDated.mockReturnValue(true);

      const { result } = renderHook(() =>
        useListTableRowActions({
          ...defaultConfig,
          canDelete: () => false,
        }),
      );

      const row = makeRow();
      const actions = result.current(row);

      expect(actions).toHaveLength(1);
    });

    it('includes delete when canDelete returns true', () => {
      mockIsFutureDated.mockReturnValue(true);

      const { result } = renderHook(() =>
        useListTableRowActions({
          ...defaultConfig,
          canDelete: () => true,
        }),
      );

      const row = makeRow();
      const actions = result.current(row);

      expect(actions).toHaveLength(2);
    });

    it('includes delete when canDelete is not provided (defaults to true)', () => {
      mockIsFutureDated.mockReturnValue(true);

      const { result } = renderHook(() => useListTableRowActions(defaultConfig));

      const row = makeRow();
      const actions = result.current(row);

      expect(actions).toHaveLength(2);
    });
  });

  describe('memoization', () => {
    it('returns same function reference across re-renders when config is stable', () => {
      mockIsFutureDated.mockReturnValue(false);

      const { result, rerender } = renderHook(() => useListTableRowActions(defaultConfig));

      const firstRef = result.current;

      rerender();

      expect(result.current).toBe(firstRef);
    });
  });
});
