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
const useSyncPreferencesToFilters = <Filters extends Record<string, any>>(
  setFilters: React.Dispatch<React.SetStateAction<Filters>>,
  mapping: Record<string, string>,
  transform?: (prefKey: string, prefValue: any) => any
) => {
  const { userPreference } = usePreference();

  useEffect(() => {
    setFilters((prev) => {
      let updated = { ...prev };
      for (const [prefKey, filterKey] of Object.entries(mapping)) {
        const prefValue = userPreference[prefKey];
        (updated as Record<string, any>)[filterKey] = transform
          ? transform(prefKey, prefValue)
          : prefValue;
      }
      return updated;
    });
    // Only re-run when preferences or mapping change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreference, mapping]);
};

export default useSyncPreferencesToFilters;
