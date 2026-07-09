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
  const { userPreference, updatePreferences } = usePreference();

  useEffect(() => {
    const preferenceHeaders = tableHeaders
      .filter((header) => header.selected)
      .map((header) => getHeaderId(header));
    // Update the ref to track saved IDs
    tableHeadersRef.current = [...new Set(preferenceHeaders)];
    updatePreferences({ tableHeaders: { [id]: [...new Set(preferenceHeaders)] } });
  }, [tableHeaders, id]);

  useEffect(() => {
    if (tableHeadersRef.current) {
      // Update table headers with saved IDs from ref
      setTableHeaders(
        headers.map((header) => ({
          ...header,
          selected: tableHeadersRef.current!.includes(getHeaderId(header)),
        })),
      );
    }
  }, [id]);

  const onToggleHeader = (headerId: string) => {
    setTableHeaders((prevHeaders) => {
      const savedIds = tableHeadersRef.current;
      return prevHeaders.map((header) => {
        // Find the header to toggle by id
        if (getHeaderId(header) === headerId) {
          // Toggle the header's selected state
          const newSelected = !header.selected;
          // Update the ref to track saved IDs
          if (savedIds) {
            const newSavedIds = [...savedIds];
            const idx = newSavedIds.indexOf(getHeaderId(header));
            if (idx > -1) {
              newSavedIds.splice(idx, 1);
            } else {
              newSavedIds.push(getHeaderId(header));
            }
            tableHeadersRef.current = newSavedIds;
          }
          return { ...header, selected: newSelected };
        }
        return header;
      });
    });
  };

  return { tableHeaders, onToggleHeader };
}
