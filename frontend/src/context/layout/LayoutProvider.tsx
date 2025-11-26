import { useMemo, useState } from 'react';

import { LayoutContext } from './LayoutContext';

import useBreakpoint from '@/hooks/useBreakpoint';

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const breakpoint = useBreakpoint();

  // Track if user has manually toggled the side nav (null = no manual override)
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
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
      toggleSideNav: () => setUserToggled((prev) => !!prev),
      isHeaderPanelOpen: headerPanelOpen,
      toggleHeaderPanel: () => setHeaderPanelOpen((prev) => !prev),
      closeHeaderPanel: () => setHeaderPanelOpen(false),
    }),
    [sideNavExpanded, headerPanelOpen],
  );

  return <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>;
};
