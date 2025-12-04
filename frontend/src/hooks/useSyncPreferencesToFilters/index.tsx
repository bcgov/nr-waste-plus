import { isEqual } from 'lodash';
import { useEffect, useRef } from 'react';

import type { UserPreference } from '@/context/preference/types';

import { usePreference } from '@/context/preference/usePreference';

/**
 * Syncs user preferences to filter state using a mapping dictionary and optional transform function.
 *
 * @template Filters - The filter state type
 * @param setFilters - The filter state setter
 * @param mapping - Record of preference key to filter key
 * @param transform - Optional transform function: (prefKey, prefValue) => filterValue
 */
const useSyncPreferencesToFilters = <T, PrefKeys extends string>(
  setFilters: React.Dispatch<React.SetStateAction<T>>,
  mapping: Record<PrefKeys, keyof T>,
  transform?: (prefKey: PrefKeys, prefValue: unknown) => T[keyof T],
) => {
  const { userPreference } = usePreference();
  const prevPreferenceRef = useRef<UserPreference | null>(null);

  useEffect(() => {
    const prevPreference = prevPreferenceRef.current;
    prevPreferenceRef.current = userPreference;

    // On initial mount, skip syncing to avoid overwriting existing filters
    if (!prevPreference) return;

    const changedKeys = Object.keys(userPreference).filter((key) => {
      const prefKey = key as keyof UserPreference;
      return !isEqual(userPreference[prefKey], prevPreference[prefKey]);
    });
    const relevantChanges = changedKeys.filter((key) => key in mapping);

    // If no relevant changes (AKA none of the mapping props), skip updating filters
    if (relevantChanges.length === 0) return;

    // Build updated values only for relevant changes that have a non-empty preference value
    const updatedValues = relevantChanges.reduce((acc, prefKey) => {
      const filterKey = mapping[prefKey as PrefKeys];
      const prefValue = userPreference[prefKey as keyof UserPreference];

      // Skip if preference is undefined or null
      if (prefValue === undefined || prefValue === null) {
        return acc;
      }

      const filterValue = transform ? transform(prefKey as PrefKeys, prefValue) : prefValue;

      return {
        ...acc,
        [filterKey as string]: filterValue,
      };
    }, {} as Partial<T>);

    // If no updated values to set, skip updating filters
    if (Object.keys(updatedValues).length === 0) return;

    setFilters((prev) => ({
      ...prev,
      ...updatedValues,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreference]);
};

export default useSyncPreferencesToFilters;
