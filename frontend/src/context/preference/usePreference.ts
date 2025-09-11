import { useContext } from 'react';

import { PreferenceContext } from './PreferenceContext';

/**
 * React hook to access user preferences from the PreferenceContext.
 *
 * @returns {PreferenceContextType} An object with:
 *   - userPreference: UserPreference — The current user preferences object.
 *   - updatePreferences(preference: Partial<UserPreference>): void — Function to update user preferences.
 *   - isLoaded: boolean — Indicates if the preferences have been loaded.
 *
 * @throws {Error} If used outside of a PreferenceProvider.
 */
export const usePreference = () => {
  const ctx = useContext(PreferenceContext);
  if (!ctx) {
    throw new Error('usePreference must be used within a PreferenceProvider');
  }
  return ctx;
};
