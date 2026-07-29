import { useQuery, useMutation } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import mergeWith from 'lodash/mergeWith';
import { type FC, useCallback, useEffect, useMemo } from 'react';

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

  const { mutate, isPending } = useMutation({
    mutationFn: saveUserPreference,
    onSuccess: () => refetch(),
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
