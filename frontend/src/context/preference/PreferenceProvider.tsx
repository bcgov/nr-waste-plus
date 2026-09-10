import { useMutation, useQuery } from '@tanstack/react-query';
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

  // Tracks the latest locally-known preference state, kept in sync synchronously on
  // every `updatePreferences` call, so rapid successive updates always merge on top
  // of each other instead of the possibly-stale cached query `data` (which may not
  // yet reflect an earlier save that hasn't finished its round trip).
  const latestKnownPreference = useRef<UserPreference | undefined>(data);
  useEffect(() => {
    latestKnownPreference.current = data;
  }, [data]);

  const { mutate, isPending } = useMutation({
    // Mutations sharing a `scope.id` are queued by TanStack Query and run strictly
    // one at a time, in call order. The backend replaces the complete preferences
    // object on save, so without this an older in-flight save resolving after a
    // newer one could silently overwrite the newer selection server-side.
    scope: { id: 'user-preference-save' },
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

      // Merge against the latest known state, which is always kept up to date
      // regardless of whether a save is currently in flight, so rapid successive
      // updates always build on top of each other instead of the possibly-stale
      // cached query `data`.
      const base = latestKnownPreference.current ?? data;
      const updatedPreferences = mergeWith({}, base, preference, customizer) as UserPreference;

      // Check if preference actually contains changes compared to the state we're
      // about to build on
      const hasChanges = !isEqual(updatedPreferences, base);

      // Skip when there are no changes and no mutation is already in flight
      // (the isPending check prevents stale cached data from blocking a rapid toggle-back)
      if (!isPending && !hasChanges) {
        return;
      }

      latestKnownPreference.current = updatedPreferences;
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
