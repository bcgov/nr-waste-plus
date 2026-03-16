import { useContext } from 'react';

import { AuthContext } from './AuthContext';

/**
 * Returns the current authentication context.
 *
 * @returns The active auth context value.
 * @throws Error when used outside of an AuthProvider.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
