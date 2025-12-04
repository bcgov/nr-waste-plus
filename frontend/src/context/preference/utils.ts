import { type UserPreference } from './types';

import APIs from '@/services/APIs';

export const initialValue: UserPreference = {
  theme: 'g10',
};

const loadUserPreference = async (): Promise<UserPreference> => {
  const loadedPreferences = await APIs.user.getUserPreferences();
  if (loadedPreferences && Object.keys(loadedPreferences).length > 0) {
    return loadedPreferences;
  }
  // Fallback to initialValue if API returns nothing
  return await saveUserPreference(initialValue);
};

const saveUserPreference = async (preference: Partial<UserPreference>): Promise<UserPreference> => {
  const currentPreferences = await APIs.user.getUserPreferences();
  const updatedPreferences = { ...currentPreferences, ...preference } as UserPreference;
  await APIs.user.updateUserPreferences(updatedPreferences);
  return updatedPreferences;
};

export { loadUserPreference, saveUserPreference };
