import { useQuery, useMutation } from '@tanstack/react-query';
import { isEqual, mergeWith } from 'lodash';
import { type FC, useCallback, useEffect, useMemo } from 'react';

import { PreferenceContext, type PreferenceProviderProps } from './PreferenceContext';
import { type UserPreference } from './types';
import { initialValue, loadUserPreference, saveUserPreference } from './utils'; // initialValue used for fallback only

export const PreferenceProvider: FC<PreferenceProviderProps> = ({ children }) => {
  const { isFetched, data, refetch } = useQuery({
    queryKey: ['userPreference'],
    queryFn: async () => await loadUserPreference(),
    enabled: false,
  });

  const { mutate } = useMutation({
    mutationFn: saveUserPreference,
    onSuccess: () => refetch(),
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

      // Don't update until loaded and only if there are changes
      if (!hasChanges || !isFetched) {
        return;
      }
      mutate(updatedPreferences);
    },
    [mutate, isFetched, data],
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
