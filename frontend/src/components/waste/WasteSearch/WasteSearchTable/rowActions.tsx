import { BookmarkAdd, BookmarkFilled } from '@carbon/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';
import type { ReportingUnitSearchResultDto } from '@/services/search.types';

import API from '@/services/APIs';

type WasteSearchRow = PageableResponse<ReportingUnitSearchResultDto>['content'][number];

type WasteSearchEvent = {
  title: string;
  description: string;
  eventType: 'info' | 'error';
  eventTarget: 'waste-search';
};

type WasteSearchEventSender = (event: WasteSearchEvent) => void;

type UseWasteSearchRowActionsOptions = {
  sendEvent: WasteSearchEventSender;
  onToggleRefresh?: () => void | Promise<unknown>;
};

export const useWasteSearchRowActions = ({
  sendEvent,
  onToggleRefresh,
}: UseWasteSearchRowActionsOptions) => {
  const [pendingToggleRows, setPendingToggleRows] = useState<Set<number>>(new Set());

  const toggleBookmarkApiCall = async (row: WasteSearchRow) => {
    if (row.bookmarked) {
      await API.user.deleteUserBookmarkedRu(row.ruNumber);
    } else {
      await API.user.setUserBookmarkedRu(row.ruNumber);
    }
    return row;
  };

  const toggleBookmarkMutation = useMutation({
    mutationFn: toggleBookmarkApiCall,
    onMutate: async (row) => {
      setPendingToggleRows((prev) => {
        const next = new Set(prev);
        next.add(row.ruNumber);
        return next;
      });
    },
    onSuccess: (row) => {
      sendEvent({
        title: row.bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
        description: `Reporting unit ${row.ruNumber} was ${row.bookmarked ? 'removed from' : 'added to'} bookmarks successfully`,
        eventType: 'info',
        eventTarget: 'waste-search',
      });
      onToggleRefresh?.();
    },
    onError: (_error, row) => {
      sendEvent({
        title: 'Failed to toggle bookmark',
        description: `Failed to toggle bookmark for Reporting Unit ${row.ruNumber}`,
        eventType: 'error',
        eventTarget: 'waste-search',
      });
    },
    onSettled: (_data, _error, row) => {
      setPendingToggleRows((prev) => {
        const next = new Set(prev);
        next.delete(row.ruNumber);
        return next;
      });
    },
  });

  return (row: WasteSearchRow): TableRowAction<ReportingUnitSearchResultDto>[] => [
    {
      id: 'toggle-bookmark',
      label: row.bookmarked ? 'Remove from bookmarked' : 'Bookmark this reporting unit',
      icon: row.bookmarked ? <BookmarkFilled /> : <BookmarkAdd />,
      isLoading: (selectedRow) => pendingToggleRows.has(selectedRow.ruNumber),
      onClick: async (selectedRow) => {
        await toggleBookmarkMutation.mutateAsync(selectedRow);
      },
    },
  ];
};
