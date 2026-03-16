import { Loading } from '@carbon/react';
import { Suspense, useEffect, useMemo, useState, type FC } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { useAuth } from '@/context/auth/useAuth';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';
import { persistRedirectUrl } from '@/routes/redirectStorage';
import { getProtectedRoutes, getPublicRoutes } from '@/routes/routePaths';

const PATHS_NOT_TO_REDIRECT = new Set(['/', '/no-role', '/unauthorized']);

/**
 * Determines whether the current path should be persisted for post-login redirection.
 *
 * @param pathname The current browser pathname.
 * @returns True when the path should be stored for a later redirect.
 */
const shouldCaptureRedirectUrl = (pathname: string): boolean => {
  if (PATHS_NOT_TO_REDIRECT.has(pathname)) return false;
  if (pathname === '/dashboard') return false;

  return true;
};

/**
 * Builds the router for the current auth state and keeps the page title in sync.
 *
 * @returns The application router provider or a loading indicator while auth is resolving.
 */
const AppRoutes: FC = () => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const { setPageTitle } = usePageTitle();

  const displayLoading = () => <Loading data-testid="loading" withOverlay={true} />;

  const [intendedUrl] = useState(() => {
    const { pathname, search } = globalThis.location;
    return shouldCaptureRedirectUrl(pathname) ? `${pathname}${search}` : null;
  });

  useEffect(() => {
    if (!isLoading && !isLoggedIn && intendedUrl) {
      persistRedirectUrl(intendedUrl);
    }
  }, [isLoading, isLoggedIn, intendedUrl]);

  const routesToUse = useMemo(() => {
    if (!isLoggedIn) return getPublicRoutes();
    return getProtectedRoutes(true, user?.roles || []);
  }, [isLoggedIn, user?.roles]);

  const browserRouter = useMemo(() => createBrowserRouter(routesToUse), [routesToUse]);

  useEffect(() => {
    const currentRoute = routesToUse.find((route) => route.path === globalThis.location.pathname);
    if (currentRoute) {
      setPageTitle(currentRoute.id || '', 1);
    }
  }, [routesToUse, setPageTitle]);

  if (isLoading) {
    return displayLoading();
  }

  return (
    <Suspense fallback={displayLoading()}>
      <RouterProvider router={browserRouter} />
    </Suspense>
  );
};

export default AppRoutes;
