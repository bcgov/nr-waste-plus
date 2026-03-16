import { useContext } from 'react';

import { PageTitleContext } from './PageTitleContext';

/**
 * Returns the page title context used to coordinate document titles.
 *
 * @returns The active page title context value.
 * @throws Error when used outside of a PageTitleProvider.
 */
export const usePageTitle = () => {
  const ctx = useContext(PageTitleContext);
  if (!ctx) {
    throw new Error('usePageTitle must be used within a PageTitleProvider');
  }
  return ctx;
};
