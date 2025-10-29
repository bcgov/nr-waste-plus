import { useState, useEffect, type ReactNode, useCallback, useMemo } from 'react';

import { env } from '@/env';

import { PageTitleContext } from './PageTitleContext';

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
