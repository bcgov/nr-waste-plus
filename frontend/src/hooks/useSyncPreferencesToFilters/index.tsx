import { useEffect } from 'react';

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
  useEffect(() => {
    const updatedValues = Object.entries(mapping)
      .map(([prefKey, filterKey]) => {
        const prefValue = userPreference[prefKey];
        const filterValue = transform ? transform(prefKey as PrefKeys, prefValue) : prefValue;
        if (filterValue) return { [filterKey as string]: filterValue } as Partial<T>;
        return {};
      })
      .reduce((acc, curr) => ({ ...acc, ...curr }), {} as Partial<T>);
    setFilters((prev) => ({
      ...prev,
      ...updatedValues,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreference]);
};

export default useSyncPreferencesToFilters;
