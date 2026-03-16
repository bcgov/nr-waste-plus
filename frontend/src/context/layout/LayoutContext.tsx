import { createContext } from 'react';

/**
 * Shape of the shared layout state used by the header and side navigation.
 */
export type LayoutContextType = {
  isSideNavExpanded: boolean;
  toggleSideNav: () => void;
  isHeaderPanelOpen: boolean;
  toggleHeaderPanel: () => void;
  closeHeaderPanel: () => void;
};

/**
 * React context storing layout state for shell components.
 */
export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
