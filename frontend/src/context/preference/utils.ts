import { type UserPreference } from './types';

import APIs from '@/services/APIs';

export const initialValue: UserPreference = {
  theme: 'g10',
};

const loadUserPreference = async (): Promise<UserPreference> => {
  const storedPreference = localStorage.getItem('userPreference');
  if (storedPreference) {
    return JSON.parse(storedPreference);
  }
  // Not found in localStorage, fetch from API
  const loadedPreferences = await APIs.user.getUserPreferences();
  if (loadedPreferences && Object.keys(loadedPreferences).length > 0) {
    localStorage.setItem('userPreference', JSON.stringify(loadedPreferences));
    return loadedPreferences;
  }
  // Fallback to initialValue if API returns nothing
  return await saveUserPreference(initialValue);
};

const saveUserPreference = async (preference: Partial<UserPreference>): Promise<UserPreference> => {
  // Get current preferences from API (not localStorage)
  const currentPreferences = await APIs.user.getUserPreferences();
  const updatedPreferences = { ...currentPreferences, ...preference } as UserPreference;
  await APIs.user.updateUserPreferences(updatedPreferences);
  localStorage.setItem('userPreference', JSON.stringify(updatedPreferences));
  return updatedPreferences;
};

export { loadUserPreference, saveUserPreference };
