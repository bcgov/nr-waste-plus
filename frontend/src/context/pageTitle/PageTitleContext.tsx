import { createContext } from 'react';

/**
 * Shape of the page title context.
 */
export type PageTitleContextData = {
  pageTitle: string;
  setPageTitle: (title: string, hierarchy?: 1 | 2 | 3) => void;
  currentHierarchy: number;
};

/**
 * React context storing the current document title state.
 */
export const PageTitleContext = createContext<PageTitleContextData | undefined>(undefined);
