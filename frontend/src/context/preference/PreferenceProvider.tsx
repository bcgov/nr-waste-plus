import { useQuery, useMutation } from '@tanstack/react-query';
import { merge } from 'lodash';
import { type FC, useCallback, useMemo } from 'react';

import { PreferenceContext, type PreferenceProviderProps } from './PreferenceContext';
import { type UserPreference } from './types';
import { initialValue, loadUserPreference, saveUserPreference } from './utils'; // initialValue used for fallback only

export const PreferenceProvider: FC<PreferenceProviderProps> = ({ children }) => {
  const { isFetched, data, refetch } = useQuery({
    queryKey: ['userPreference'],
    queryFn: async () => await loadUserPreference(),
    refetchOnMount: true,
  });

  const { mutate } = useMutation({
    mutationFn: saveUserPreference,
    onSuccess: () => refetch(),
  });

  const updatePreferences = useCallback(
    (preference: Partial<UserPreference>) => {
      if (!isFetched) return; // Don't update until loaded
      const updatedPreferences = merge({}, data, preference) as UserPreference;
      mutate(updatedPreferences);
    },
    [mutate, isFetched, data],
  );

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
