import { Theme } from '@carbon/react';
import { useState, useEffect, useRef, type ReactNode, useMemo } from 'react';

import { useAnnouncer } from '@/context/announcer/useAnnouncer';
import { type CarbonTheme } from '@/context/preference/types';
import { usePreference } from '@/context/preference/usePreference';

import { ThemeContext } from './ThemeContext';

/**
 * Synchronizes the active Carbon theme with persisted user preferences.
 *
 * @param props The provider props.
 * @param props.children The subtree that should inherit the active theme.
 * @returns The theme context provider and Carbon theme wrapper.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const preferences = usePreference();
  const { updatePreferences, userPreference } = preferences;
  const { announce } = useAnnouncer();
  const [theme, setTheme] = useState<CarbonTheme | undefined>(undefined);

  // Adopt the persisted preference exactly once, on initial load. After that the
  // local theme is the source of truth so a user-initiated toggle is never
  // clobbered by a re-sync (e.g. a refetch that echoes a stale value).
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (initialSyncDone.current || !userPreference?.theme) {
      return;
    }
    initialSyncDone.current = true;
    setTheme(userPreference.theme);
    document.documentElement.dataset.carbonTheme = userPreference.theme;
  }, [userPreference]);

  const contextValue = useMemo(() => {
    const toggleTheme = () => {
      const nextTheme = (theme ?? userPreference?.theme ?? 'g10') === 'g10' ? 'g100' : 'g10';
      setTheme(nextTheme);
      announce(nextTheme === 'g100' ? 'Dark mode enabled' : 'Light mode enabled');
      // Kick off the persistence synchronously so the preference response is
      // already in flight when the e2e test waits for it.
      updatePreferences({ theme: nextTheme });
    };

    return {
      theme: theme ?? 'g10',
      setTheme,
      toggleTheme,
    };
  }, [theme, userPreference, setTheme, updatePreferences, announce]);

  // Only render Theme when theme is set.
  return (
    <ThemeContext.Provider value={contextValue}>
      {theme ? <Theme theme={theme}>{children}</Theme> : null}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
