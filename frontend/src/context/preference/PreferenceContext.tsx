import { createContext, type ReactNode } from 'react';

import type { UserPreference } from './types';

/**
 * The context value for user preferences.
 *
 * @property {UserPreference} userPreference - The current user preferences object.
 * @property {(preference: Partial<UserPreference>) => void} updatePreferences - Function to update user preferences. Accepts a partial UserPreference object.
 * @property {boolean} isLoaded - Indicates if the preferences have been loaded from storage or API.
 */
export type PreferenceContextType = {
  /** The current user preferences object. */
  userPreference: UserPreference;
  /**
   * Function to update user preferences. Accepts a partial UserPreference object.
   * @param preference Partial user preference object to update.
   */
  updatePreferences: (preference: Partial<UserPreference>) => void;
  /** Indicates if the preferences have been loaded from storage or API. */
  isLoaded: boolean;
};

export type PreferenceProviderProps = {
  children: ReactNode;
};

export const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);
