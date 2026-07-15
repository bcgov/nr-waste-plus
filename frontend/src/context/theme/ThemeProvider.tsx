import { Theme } from '@carbon/react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ThemeContext } from './ThemeContext';

import { type CarbonTheme } from '@/context/preference/types';
import { usePreference } from '@/context/preference/usePreference';

/**
 * Synchronizes the active Carbon theme with persisted user preferences.
 *
 * @param props The provider props.
 * @param props.children The subtree that should inherit the active theme.
 * @returns The theme context provider and Carbon theme wrapper.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { userPreference, updatePreferences } = usePreference();
  const [theme, setThemeState] = useState<CarbonTheme>(userPreference?.theme ?? 'g10');

  // Re-sync the local theme whenever the persisted preference loads or changes.
  // This effect intentionally copies an external store value into local state to
  // preserve optimistic updates in setTheme/toggleTheme; it is the sanctioned
  // exception to react-hooks/set-state-in-effect.
  useEffect(() => {
    if (userPreference?.theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(userPreference.theme);
      document.documentElement.dataset.carbonTheme = userPreference.theme;
    }
  }, [userPreference]);

  const currentTheme = theme ?? userPreference?.theme ?? 'g10';

  const setTheme = useCallback(
    (nextTheme: CarbonTheme) => {
      setThemeState(nextTheme);
      updatePreferences({ theme: nextTheme });
    },
    [updatePreferences],
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = currentTheme === 'g10' ? 'g100' : 'g10';
    setThemeState(nextTheme);
    updatePreferences({ theme: nextTheme });
  }, [currentTheme, updatePreferences]);

  useEffect(() => {
    document.documentElement.dataset.carbonTheme = currentTheme;
  }, [currentTheme]);

  const contextValue = useMemo(() => {
    return {
      theme: currentTheme,
      setTheme,
      toggleTheme,
    };
  }, [currentTheme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <Theme theme={contextValue.theme}>{children}</Theme>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
