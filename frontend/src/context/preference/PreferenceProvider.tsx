import { useQuery, useMutation } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import mergeWith from 'lodash/mergeWith';
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react';

import { PreferenceContext, type PreferenceProviderProps } from './PreferenceContext';
import { type UserPreference } from './types';
import { initialValue, loadUserPreference, saveUserPreference } from './utils'; // initialValue used for fallback only

import { queryKeys } from '@/config/react-query/queryKeys';

export const PreferenceProvider: FC<PreferenceProviderProps> = ({ children }) => {
  const { isFetched, data, refetch } = useQuery({
    queryKey: queryKeys.preference.userPreference(),
    queryFn: async () => await loadUserPreference(),
    enabled: false,
  });

  // Tracks the most recently initiated save so that if two saves are in flight at once
  // (e.g. rapid selection changes) an earlier request resolving after a later one can't
  // clobber the newer state by triggering a refetch out of order.
  const latestRequestId = useRef(0);

  const { mutate, isPending } = useMutation({
    mutationFn: async (preference: UserPreference) => {
      const requestId = ++latestRequestId.current;
      const saved = await saveUserPreference(preference);
      return { saved, requestId };
    },
    onSuccess: ({ requestId }) => {
      // Ignore stale responses: only refetch if no newer save has been started since.
      if (requestId === latestRequestId.current) {
        refetch();
      }
    },
    onError: (error: Error) => {
      console.error('Failed to save user preference:', error);
    },
  });

  const updatePreferences = useCallback(
    (preference: Partial<UserPreference>) => {
      // Customizer to handle array merging
      const customizer = (objValue: unknown, srcValue: unknown) => {
        if (Array.isArray(objValue) && Array.isArray(srcValue)) {
          // Replace only if srcValue is non-empty, otherwise keep objValue
          return srcValue.length ? srcValue : objValue;
        }
      };

      // Merge existing data with new preference using customizer
      const updatedPreferences = mergeWith({}, data, preference, customizer) as UserPreference;

      // Check if preference actually contains changes compared to existing data
      const hasChanges = !isEqual(updatedPreferences, data);

      // Skip when there are no changes and no mutation is already in flight
      // (the isPending check prevents stale cached data from blocking a rapid toggle-back)
      if (!isPending && !hasChanges) {
        return;
      }
      mutate(updatedPreferences);
    },
    [mutate, isPending, data],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const contextValue = useMemo(
    () => ({
      userPreference: data ?? initialValue,
      updatePreferences,
      isLoaded: isFetched,
    }),
    [data, updatePreferences, isFetched],
  );

  return <PreferenceContext.Provider value={contextValue}>{children}</PreferenceContext.Provider>;
};
