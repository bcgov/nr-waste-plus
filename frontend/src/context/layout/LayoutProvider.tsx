import { useEffect, useMemo, useState } from 'react';

import useBreakpoint from '@/hooks/useBreakpoint';

import { LayoutContext } from './LayoutContext';

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const breakpoint = useBreakpoint();

  const [sideNavExpanded, setSideNavExpanded] = useState(
    breakpoint !== 'sm' && breakpoint !== 'md',
  );
  const [headerPanelOpen, setHeaderPanelOpen] = useState(false);

  useEffect(() => {
    setSideNavExpanded(breakpoint !== 'sm' && breakpoint !== 'md');
  }, [breakpoint]);

  const contextValue = useMemo(
    () => ({
      isSideNavExpanded: sideNavExpanded,
      toggleSideNav: () => setSideNavExpanded((prev) => !prev),
      isHeaderPanelOpen: headerPanelOpen,
      toggleHeaderPanel: () => setHeaderPanelOpen((prev) => !prev),
      closeHeaderPanel: () => setHeaderPanelOpen(false),
    }),
    [sideNavExpanded, headerPanelOpen],
  );

  return <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>;
};
