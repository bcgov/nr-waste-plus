import { Loading } from '@carbon/react';
import { Suspense, useEffect, useMemo, useState, type FC } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { useAuth } from '@/context/auth/useAuth';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';
import { getProtectedRoutes, getPublicRoutes } from '@/routes/routePaths';

const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';
const REDIRECT_AFTER_LOGIN_FALLBACK_KEY = 'redirectAfterLoginFallback';
const RETURN_TO_KEY = 'returnTo';
const RETURN_TO_FALLBACK_KEY = 'returnToFallback';
const PATHS_NOT_TO_REDIRECT = new Set(['/', '/no-role', '/unauthorized']);

const shouldCaptureRedirectUrl = (pathname: string, search: string): boolean => {
  if (PATHS_NOT_TO_REDIRECT.has(pathname)) return false;

  if (pathname === '/dashboard') {
    const params = new URLSearchParams(search);
    if (params.has('code') && params.has('state')) return false;
  }

  return true;
};

const persistRedirectUrl = (url: string) => {
  sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, url);
  localStorage.setItem(REDIRECT_AFTER_LOGIN_FALLBACK_KEY, url);
  sessionStorage.setItem(RETURN_TO_KEY, url);
  localStorage.setItem(RETURN_TO_FALLBACK_KEY, url);
};

const AppRoutes: FC = () => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const { setPageTitle } = usePageTitle();

  const displayLoading = () => <Loading data-testid="loading" withOverlay={true} />;

  const [intendedUrl] = useState(() => {
    const { pathname, search } = globalThis.location;
    return shouldCaptureRedirectUrl(pathname, search) ? `${pathname}${search}` : null;
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
