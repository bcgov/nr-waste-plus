import { useEffect, useState, useRef } from 'react';

import { type TableHeaderType, getHeaderId } from './types';

import type { NestedKeyOf } from '@/services/types';

import { usePreference } from '@/context/preference/usePreference';

/**
 * Custom hook for managing table column visibility and persistence.
 * Handles loading user preferences and updating column visibility state.
 *
 * @template T
 * @param id The unique table identifier used for preference persistence
 * @param headers The default column headers
 * @returns Object containing:
 *   - tableHeaders: Current headers with visibility state
 *   - onToggleHeader: Function to toggle column visibility
 */
export function useTableToolbar<T>(id: string, headers: TableHeaderType<T, NestedKeyOf<T>>[]) {
  const [tableHeaders, setTableHeaders] = useState(headers);
  const tableHeadersRef = useRef<string[] | undefined>(undefined);
  const { userPreference, updatePreferences, isLoaded } = usePreference();
  // Apply the saved column selection once preferences have loaded. Until then we
  // keep the default `headers` so we never overwrite stored selections.
  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    const savedIds = (userPreference.tableHeaders as Record<string, string[]> | undefined)?.[id];
    const initialIds =
      savedIds && Array.isArray(savedIds) && savedIds.length > 0
        ? savedIds
        : headers.filter((header) => header.selected).map(getHeaderId);
    const nextIds = [...new Set(initialIds)];
    // Skip the update when the applied selection is unchanged to avoid render loops.
    if (tableHeadersRef.current && tableHeadersRef.current.join(',') === nextIds.join(',')) {
      return;
    }
    tableHeadersRef.current = nextIds;
    setTableHeaders(
      headers.map((header) => ({
        ...header,
        selected: nextIds.includes(getHeaderId(header)),
      })),
    );
  }, [id, headers, isLoaded, userPreference]);

  const onToggleHeader = (headerId: string) => {
    const toggled = tableHeaders.find((header) => getHeaderId(header) === headerId);
    if (!toggled) {
      return;
    }
    const savedIds = tableHeadersRef.current
      ? [...tableHeadersRef.current]
      : tableHeaders.filter((header) => header.selected).map(getHeaderId);
    const idx = savedIds.indexOf(headerId);
    if (idx > -1) {
      savedIds.splice(idx, 1);
    } else {
      savedIds.push(headerId);
    }
    const nextIds = [...new Set(savedIds)];
    tableHeadersRef.current = nextIds;
    setTableHeaders((prevHeaders) =>
      prevHeaders.map((header) =>
        getHeaderId(header) === headerId ? { ...header, selected: !toggled.selected } : header,
      ),
    );
    if (nextIds.length > 0) {
      updatePreferences({ tableHeaders: { [id]: nextIds } });
    }
  };

  return { tableHeaders, onToggleHeader };
}
