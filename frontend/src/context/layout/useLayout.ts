import { useContext } from 'react';

import { LayoutContext } from './LayoutContext';

/**
 * Returns the layout context that controls navigation and header panel state.
 *
 * @returns The active layout context value.
 * @throws Error when used outside of a LayoutProvider.
 */
export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return ctx;
};
