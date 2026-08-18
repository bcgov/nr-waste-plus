import { useNavigate } from '@tanstack/react-router';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useSpeciesCompositionListRowActions } from './actions';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';

import { resolveTableRowActionValue } from '@/components/Form/TableResource/types';
import { navigateInTree } from '@/routes/inTreePaths';
import { isFutureDated } from '@/utils/businessDate';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

vi.mock('@/utils/businessDate', () => ({
  isFutureDated: vi.fn(),
}));

const mockIsFutureDated = vi.mocked(isFutureDated);

type SpeciesCompositionRow = PageableResponse<SpeciesCompositionListItem>['content'][number];

const makeRow = (overrides: Partial<SpeciesCompositionRow> = {}): SpeciesCompositionRow => ({
  id: 42,
  startDate: '2025-01-01',
  endDate: null,
  uploadedBy: 'admin@gov.bc.ca',
  dateOfUpload: '2025-01-15T10:30:00',
  ...overrides,
});

describe('useSpeciesCompositionListRowActions', () => {
  let mockNavigate: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate = vi.fn();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
    mockIsFutureDated.mockReturnValue(false);
  });

  describe('action structure', () => {
    it('returns a single view-details action for current or past rows', () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('view-details');
    });

    it('returns "See details" label', () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());
      expect(actions[0].label).toBe('See details');
    });

    it('returns an icon for the action', () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());
      expect(actions[0].icon).toBeDefined();
    });

    it('is not disabled by default', () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());
      expect(actions[0].isDisabled).toBeUndefined();
    });

    it('is not loading by default', () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());
      expect(actions[0].isLoading).toBeUndefined();
    });
  });

  describe('delete action', () => {
    it('includes a delete action for future-dated rows', () => {
      mockIsFutureDated.mockReturnValue(true);
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());

      expect(actions).toHaveLength(2);
      expect(actions[1].id).toBe('delete');
    });

    it('omits the delete action for current or past rows', () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const actions = result.current(makeRow());

      expect(actions).toHaveLength(1);
      expect(actions.some((action) => action.id === 'delete')).toBe(false);
    });

    it('checks the row start date against the business date', () => {
      mockIsFutureDated.mockReturnValue(true);
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const row = makeRow({ startDate: '2026-09-01' });

      result.current(row);

      expect(mockIsFutureDated).toHaveBeenCalledWith('2026-09-01');
    });

    it('uses a row-specific accessible label for the delete action', () => {
      mockIsFutureDated.mockReturnValue(true);
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const row = makeRow({ id: 7, startDate: '2026-09-01' });
      const actions = result.current(row);

      expect(resolveTableRowActionValue(actions[1].label, row)).toBe(
        'Delete species composition starting 2026-09-01',
      );
    });

    it('calls onDeleteClick with the row when delete is picked', async () => {
      mockIsFutureDated.mockReturnValue(true);
      const onDeleteClick = vi.fn();
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(onDeleteClick));
      const row = makeRow({ id: 99, startDate: '2026-09-01' });
      const deleteAction = result.current(row)[1];

      await deleteAction.onClick(row);

      expect(onDeleteClick).toHaveBeenCalledWith(row);
    });
  });

  describe('navigation', () => {
    it('navigates to the detail page on click', async () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const row = makeRow({ id: 99 });

      await result.current(row)[0].onClick(row);

      expect(navigateInTree).toHaveBeenCalledWith(
        mockNavigate,
        '/configuration/species-composition/99',
      );
    });

    it('navigates with different row ids', async () => {
      const { result } = renderHook(() => useSpeciesCompositionListRowActions(vi.fn()));
      const row = makeRow({ id: 7 });

      await result.current(row)[0].onClick(row);

      expect(navigateInTree).toHaveBeenCalledWith(
        mockNavigate,
        '/configuration/species-composition/7',
      );
    });
  });
});
