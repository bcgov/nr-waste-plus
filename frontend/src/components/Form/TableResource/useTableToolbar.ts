import { useEffect, useState } from 'react';

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
  const { userPreference, updatePreferences, isLoaded } = usePreference();

  const loadTableFromPreferences = () => {
    if (userPreference.tableHeaders) {
      const savedIds = (userPreference.tableHeaders as Record<string, string[]>)[id];

      if (savedIds && Array.isArray(savedIds)) {
        setTableHeaders(
          headers.map((header) => ({
            ...header,
            selected: savedIds.includes(getHeaderId(header)),
          })),
        );
      } else {
        setTableHeaders(headers); // fallback to default
      }
    }
  };

  useEffect(() => {
    const preferenceHeaders = tableHeaders
      .filter((header) => header.selected)
      .map((header) => getHeaderId(header));
    updatePreferences({ tableHeaders: { [id]: [...new Set(preferenceHeaders)] } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableHeaders]);

  useEffect(() => {
    loadTableFromPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const onToggleHeader = (headerId: string) => {
    setTableHeaders((prevHeaders) => {
      return prevHeaders.map((header) => {
        // Find the header to toggle by id
        if (getHeaderId(header) === headerId) {
          // Toggle the header's selected state
          return { ...header, selected: !header.selected };
        }
        return header;
      });
    });
  };

  return { tableHeaders, onToggleHeader };
}
