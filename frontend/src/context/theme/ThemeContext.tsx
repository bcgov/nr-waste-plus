import { createContext } from 'react';

import type { CarbonTheme } from '@/context/preference/types';

/**
 * Shape of the theme context shared across the app.
 */
export type ThemeContextData = {
  theme: CarbonTheme;
  setTheme: (theme: CarbonTheme) => void;
  toggleTheme: () => void;
};

/**
 * React context storing the active Carbon theme and theme actions.
 */
export const ThemeContext = createContext<ThemeContextData | undefined>(undefined);
