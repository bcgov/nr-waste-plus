/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import { useWasteSearchRowActions } from './rowActions';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ReportingUnitSearchResultDto } from '@/services/search.types';

import APIs from '@/services/APIs';

vi.mock('@/services/APIs', () => ({
  default: {
    user: {
      setUserBookmarkedRu: vi.fn(),
      deleteUserBookmarkedRu: vi.fn(),
      getUserPreferences: vi.fn().mockResolvedValue({}),
      updateUserPreferences: vi.fn().mockResolvedValue({}),
    },
  },
}));

type WasteSearchRow = PageableResponse<ReportingUnitSearchResultDto>['content'][number];

const makeRow = (overrides: Partial<WasteSearchRow> = {}): WasteSearchRow => ({
  id: 'RU-100-Block-A1-999',
  cutBlockId: 'A1',
  wasteAssessmentAreaId: 100,
  ruNumber: 100,
  client: { code: '00010001', description: 'TEST CLIENT' },
  licenseNumber: 'L001',
  cuttingPermit: 'CP001',
  timberMark: 'TM001',
  multiMark: false,
  secondaryEntry: false,
  sampling: { code: 'OCU', description: 'Ocular' },
  district: { code: 'DCC', description: 'Cariboo-Chilcotin' },
  status: { code: 'SUB', description: 'Submitted' },
  lastUpdated: '2025-01-01T00:00:00',
  bookmarked: false,
  ...overrides,
});

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useWasteSearchRowActions', () => {
  let sendEventMock: Mock;
  let onToggleRefreshMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    sendEventMock = vi.fn();
    onToggleRefreshMock = vi.fn();
    (APIs.user.setUserBookmarkedRu as Mock).mockResolvedValue(undefined);
    (APIs.user.deleteUserBookmarkedRu as Mock).mockResolvedValue(undefined);
  });

  const renderRowActionsHook = (onToggleRefresh?: () => void) =>
    renderHook(
      () =>
        useWasteSearchRowActions({
          sendEvent: sendEventMock,
          onToggleRefresh: onToggleRefresh ?? onToggleRefreshMock,
        }),
      { wrapper: createWrapper() },
    );

  describe('action structure', () => {
    it('returns a single toggle-bookmark action', () => {
      const { result } = renderRowActionsHook();
      const actions = result.current(makeRow());
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('toggle-bookmark');
    });

    it('returns "Bookmark this reporting unit" label when not bookmarked', () => {
      const { result } = renderRowActionsHook();
      const actions = result.current(makeRow({ bookmarked: false }));
      expect(actions[0].label).toBe('Bookmark this reporting unit');
    });

    it('returns "Remove from bookmarked" label when bookmarked', () => {
      const { result } = renderRowActionsHook();
      const actions = result.current(makeRow({ bookmarked: true }));
      expect(actions[0].label).toBe('Remove from bookmarked');
    });

    it('isLoading returns false when no mutation is pending', () => {
      const { result } = renderRowActionsHook();
      const row = makeRow();
      const actions = result.current(row);
      const isLoading = (actions[0].isLoading as (r: any) => boolean)(row);
      expect(isLoading).toBe(false);
    });
  });

  describe('bookmark add (non-bookmarked row)', () => {
    it('calls setUserBookmarkedRu with the ruNumber', async () => {
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: false, ruNumber: 42 });

      await act(async () => {
        const actions = result.current(row);
        await actions[0].onClick(row);
      });

      expect(APIs.user.setUserBookmarkedRu).toHaveBeenCalledWith(42);
      expect(APIs.user.deleteUserBookmarkedRu).not.toHaveBeenCalled();
    });

    it('sends an "Added to bookmarks" event on success', async () => {
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: false, ruNumber: 42 });

      await act(async () => {
        const actions = result.current(row);
        await actions[0].onClick(row);
      });

      expect(sendEventMock).toHaveBeenCalledWith({
        title: 'Added to bookmarks',
        description: 'Reporting unit 42 was added to bookmarks successfully',
        eventType: 'info',
        eventTarget: 'waste-search',
      });
    });

    it('calls onToggleRefresh on success', async () => {
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: false });

      await act(async () => {
        const actions = result.current(row);
        await actions[0].onClick(row);
      });

      expect(onToggleRefreshMock).toHaveBeenCalled();
    });
  });

  describe('bookmark remove (bookmarked row)', () => {
    it('calls deleteUserBookmarkedRu with the ruNumber', async () => {
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: true, ruNumber: 99 });

      await act(async () => {
        const actions = result.current(row);
        await actions[0].onClick(row);
      });

      expect(APIs.user.deleteUserBookmarkedRu).toHaveBeenCalledWith(99);
      expect(APIs.user.setUserBookmarkedRu).not.toHaveBeenCalled();
    });

    it('sends a "Removed from bookmarks" event on success', async () => {
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: true, ruNumber: 99 });

      await act(async () => {
        const actions = result.current(row);
        await actions[0].onClick(row);
      });

      expect(sendEventMock).toHaveBeenCalledWith({
        title: 'Removed from bookmarks',
        description: 'Reporting unit 99 was removed from bookmarks successfully',
        eventType: 'info',
        eventTarget: 'waste-search',
      });
    });
  });

  describe('error handling', () => {
    it('sends an error event when the API call fails', async () => {
      (APIs.user.setUserBookmarkedRu as Mock).mockRejectedValue(new Error('Network error'));
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: false, ruNumber: 77 });

      await act(async () => {
        const actions = result.current(row);
        try {
          await actions[0].onClick(row);
        } catch {
          // mutation.mutateAsync rejects; we only care about the event
        }
      });

      expect(sendEventMock).toHaveBeenCalledWith({
        title: 'Failed to toggle bookmark',
        description: 'Failed to toggle bookmark for Reporting Unit 77',
        eventType: 'error',
        eventTarget: 'waste-search',
      });
    });

    it('does not call onToggleRefresh when the API call fails', async () => {
      (APIs.user.deleteUserBookmarkedRu as Mock).mockRejectedValue(new Error('fail'));
      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: true });

      await act(async () => {
        const actions = result.current(row);
        try {
          await actions[0].onClick(row);
        } catch {
          // expected
        }
      });

      expect(onToggleRefreshMock).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('isLoading returns true while the mutation is in flight', async () => {
      let resolveApi!: () => void;
      (APIs.user.setUserBookmarkedRu as Mock).mockReturnValue(
        new Promise<void>((resolve) => {
          resolveApi = resolve;
        }),
      );

      const { result } = renderRowActionsHook();
      const row = makeRow({ bookmarked: false, ruNumber: 55 });

      // Start the mutation but don't await it yet
      let mutationPromise: Promise<void>;
      act(() => {
        const actions = result.current(row);
        mutationPromise = actions[0].onClick(row) as Promise<void>;
      });

      // While in flight, isLoading should be true for this row
      await waitFor(() => {
        const actions = result.current(row);
        const loading = (actions[0].isLoading as (r: any) => boolean)(row);
        expect(loading).toBe(true);
      });

      // A different row should not be loading
      const otherRow = makeRow({ ruNumber: 999 });
      const actionsOther = result.current(otherRow);
      const otherLoading = (actionsOther[0].isLoading as (r: any) => boolean)(otherRow);
      expect(otherLoading).toBe(false);

      // Resolve and verify loading clears
      await act(async () => {
        resolveApi();
        await mutationPromise;
      });

      await waitFor(() => {
        const actions = result.current(row);
        const loading = (actions[0].isLoading as (r: any) => boolean)(row);
        expect(loading).toBe(false);
      });
    });
  });

  describe('optional onToggleRefresh', () => {
    it('works without onToggleRefresh callback', async () => {
      const row = makeRow({ bookmarked: false });

      // Passing undefined for onToggleRefresh via the hook options
      const { result: resultNoRefresh } = renderHook(
        () =>
          useWasteSearchRowActions({
            sendEvent: sendEventMock,
          }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        const actions = resultNoRefresh.current(row);
        await actions[0].onClick(row);
      });

      // Should complete without error even though onToggleRefresh is undefined
      expect(sendEventMock).toHaveBeenCalled();
    });
  });
});
