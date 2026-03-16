import { useContext } from 'react';

import { ThemeContext } from './ThemeContext';

/**
 * Returns the current Carbon theme context.
 *
 * @returns The active theme context value.
 * @throws Error when used outside of a ThemeProvider.
 */
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
