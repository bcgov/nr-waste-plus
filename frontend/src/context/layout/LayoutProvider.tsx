import { useMemo, useState } from 'react';

import { useAnnouncer } from '@/context/announcer/useAnnouncer';
import useBreakpoint from '@/hooks/useBreakpoint';

import { LayoutContext } from './LayoutContext';

/**
 * Provides responsive layout state for the header panel and side navigation.
 *
 * @param props The provider props.
 * @param props.children The subtree that consumes layout state.
 * @returns The layout context provider.
 */
export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const breakpoint = useBreakpoint();
  const { announce } = useAnnouncer();

  // Track if user has manually toggled the side nav (null = no manual override)
  const [userToggled, setUserToggled] = useState<boolean | null>(false);
  const [headerPanelOpen, setHeaderPanelOpen] = useState(false);

  // Derive expanded state: user's choice takes precedence, otherwise use breakpoint
  const sideNavExpanded = useMemo(() => {
    if (userToggled !== null && (breakpoint === 'sm' || breakpoint === 'md')) {
      return userToggled;
    }
    return breakpoint !== 'sm' && breakpoint !== 'md';
  }, [breakpoint, userToggled]);

  const contextValue = useMemo(
    () => ({
      isSideNavExpanded: sideNavExpanded,
      toggleSideNav: () => setUserToggled((prev) => !prev),
      isHeaderPanelOpen: headerPanelOpen,
      toggleHeaderPanel: () => {
        const nextOpen = !headerPanelOpen;
        setHeaderPanelOpen(nextOpen);
        announce(nextOpen ? 'Profile panel opened' : 'Profile panel closed');
      },
      closeHeaderPanel: () => {
        if (headerPanelOpen) {
          setHeaderPanelOpen(false);
          announce('Profile panel closed');
        }
      },
    }),
    [sideNavExpanded, headerPanelOpen, announce],
  );

  return <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>;
};
