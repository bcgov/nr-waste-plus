import { useNavigate } from '@tanstack/react-router';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { useDistrictVolumeListRowActions } from './actions';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';

import { navigateInTree } from '@/routes/inTreePaths';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/routes/inTreePaths', () => ({
  navigateInTree: vi.fn(),
}));

type DistrictVolumeRow = PageableResponse<DistrictVolumeListItem>['content'][number];

const makeRow = (overrides: Partial<DistrictVolumeRow> = {}): DistrictVolumeRow => ({
  id: 42,
  area: 'INTERIOR',
  startDate: '2025-01-01',
  endDate: null,
  uploadedBy: 'admin@gov.bc.ca',
  dateOfUpload: '2025-01-15T10:30:00',
  ...overrides,
});

describe('useDistrictVolumeListRowActions', () => {
  let mockNavigate: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate = vi.fn();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
  });

  describe('action structure', () => {
    it('returns a single view-details action', () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const actions = result.current(makeRow());
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('view-details');
    });

    it('returns "See details" label', () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const actions = result.current(makeRow());
      expect(actions[0].label).toBe('See details');
    });

    it('returns an icon for the action', () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const actions = result.current(makeRow());
      expect(actions[0].icon).toBeDefined();
    });

    it('is not disabled by default', () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const actions = result.current(makeRow());
      expect(actions[0].isDisabled).toBeUndefined();
    });

    it('is not loading by default', () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const actions = result.current(makeRow());
      expect(actions[0].isLoading).toBeUndefined();
    });
  });

  describe('navigation', () => {
    it('navigates to the detail page on click', async () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const row = makeRow({ id: 99 });

      await result.current(row)[0].onClick(row);

      expect(navigateInTree).toHaveBeenCalledWith(
        mockNavigate,
        '/configuration/district-volume-tables/99',
      );
    });

    it('navigates with different row ids', async () => {
      const { result } = renderHook(() => useDistrictVolumeListRowActions());
      const row = makeRow({ id: 7 });

      await result.current(row)[0].onClick(row);

      expect(navigateInTree).toHaveBeenCalledWith(
        mockNavigate,
        '/configuration/district-volume-tables/7',
      );
    });
  });
});
