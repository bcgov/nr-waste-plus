import { Loading } from '@carbon/react';
import { Suspense, useEffect, useMemo, type FC } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { useAuth } from '@/context/auth/useAuth';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';
import { getProtectedRoutes, getPublicRoutes } from '@/routes/routePaths';

const AppRoutes: FC = () => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const { setPageTitle } = usePageTitle();

  const displayLoading = () => <Loading data-testid="loading" withOverlay={true} />;

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
