import { useState, useEffect, type ReactNode, useCallback, useMemo } from 'react';

import { PageTitleContext } from './PageTitleContext';

import { env } from '@/env';

/**
 * Maintains the current document title and exposes hierarchical title updates.
 *
 * @param props The provider props.
 * @param props.children The subtree that can update the page title.
 * @returns The page title context provider.
 */
export const PageTitleProvider = ({ children }: { children: ReactNode }) => {
  const [pageTitle, setPageTitle] = useState(env.VITE_APP_NAME);
  const [currentHierarchy, setCurrentHierarchy] = useState(0);

  const resolveName = (title: string) =>
    [env.VITE_APP_NAME, title].join(' - ') ?? env.VITE_APP_NAME;

  const updatePageTitle = useCallback(
    (title: string, hierarchy: 1 | 2 | 3 = 3) => {
      setPageTitle((prev) => {
        if (hierarchy >= currentHierarchy) {
          return resolveName(title);
        }
        return prev;
      });
      setCurrentHierarchy((prevHierarchy) => Math.max(hierarchy, prevHierarchy));
    },
    [currentHierarchy],
  );

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  const providerValue = useMemo(
    () => ({
      pageTitle,
      setPageTitle: updatePageTitle,
      currentHierarchy,
    }),
    [pageTitle, updatePageTitle, currentHierarchy],
  );

  return <PageTitleContext.Provider value={providerValue}>{children}</PageTitleContext.Provider>;
};

export default PageTitleProvider;
