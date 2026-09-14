import { useMutation, useQuery } from '@tanstack/react-query';
import isEqual from 'lodash/isEqual';
import mergeWith from 'lodash/mergeWith';
import { type FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { queryKeys } from '@/config/react-query/queryKeys';
import { AuthContext } from '@/context/auth/AuthContext';

import { PreferenceContext, type PreferenceProviderProps } from './PreferenceContext';
import { type UserPreference } from './types';
import { initialValue, loadUserPreference, saveUserPreference } from './utils';

export const PreferenceProvider: FC<PreferenceProviderProps> = ({ children }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const isAuthLoading = auth?.isLoading ?? false;
  const userId = user?.userName ?? user?.providerUsername;
  const { isFetched, data } = useQuery({
    queryKey: queryKeys.preference.userPreference(userId),
    queryFn: loadUserPreference,
    enabled: auth ? !isAuthLoading && userId !== undefined : true,
  });

  // Ref tracks the latest preference for merge logic inside updatePreferences.
  // Using a ref keeps updatePreferences stable (no recreation on every change),
  // preventing render loops when effects depend on the callback.
  const latestKnownRef = useRef<UserPreference | undefined>(undefined);
  const hydratedUserRef = useRef<string | undefined | null>(null);
  // State drives the context value so consumers re-render when preferences change.
  // Updated synchronously in updatePreferences for instant UI feedback.
  const [livePreference, setLivePreference] = useState<UserPreference | undefined>();

  useEffect(() => {
    if (hydratedUserRef.current !== userId) {
      hydratedUserRef.current = userId;
      latestKnownRef.current = data;
      setLivePreference(data);
      return;
    }
    if (data !== undefined && latestKnownRef.current === undefined) {
      latestKnownRef.current = data;
      setLivePreference(data);
    }
  }, [data, userId]);

  const { mutate, isPending } = useMutation({
    // Mutations sharing a `scope.id` are queued by TanStack Query and run strictly
    // one at a time, in call order. The backend replaces the complete preferences
    // object on save, so without this an older in-flight save resolving after a
    // newer one could silently overwrite the newer selection server-side.
    scope: { id: 'user-preference-save' },
    mutationFn: saveUserPreference,
    // No refetch after save — livePreference is updated synchronously in
    // updatePreferences so the UI is immediately consistent. The next background
    // refetch (stale time / window focus) will reconcile with the server.
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

      // Merge against the latest known state (ref), which is always kept up to date
      // regardless of whether a save is currently in flight, so rapid successive
      // updates always build on top of each other instead of the possibly-stale
      // cached query `data`.
      const base = latestKnownRef.current ?? data;
      const updatedPreferences = mergeWith({}, base, preference, customizer) as UserPreference;

      // Check if preference actually contains changes compared to the state we're
      // about to build on
      const hasChanges = !isEqual(updatedPreferences, base);

      // Skip when there are no changes and no mutation is already in flight
      // (the isPending check prevents stale cached data from blocking a rapid toggle-back)
      if (!isPending && !hasChanges) {
        return;
      }

      // Update ref (for merge logic) and state (for context consumers) synchronously
      latestKnownRef.current = updatedPreferences;
      setLivePreference(updatedPreferences);
      mutate(updatedPreferences);
    },
    [mutate, isPending, data],
  );

  const contextValue = useMemo(
    () => ({
      userPreference: livePreference ?? initialValue,
      updatePreferences,
      isLoaded: isFetched,
    }),
    [livePreference, updatePreferences, isFetched],
  );

  return <PreferenceContext.Provider value={contextValue}>{children}</PreferenceContext.Provider>;
};
