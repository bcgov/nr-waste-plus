import { Loading } from '@carbon/react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect } from 'react';

import { applyGuards } from './applyGuards';
import { ROUTES, SYSTEM_ROUTES, type RouteDescription } from './routePaths';

import Layout from '@/components/Layout';
import { useAuth } from '@/context/auth/useAuth';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';
import GlobalErrorPage from '@/pages/GlobalError';
import NotFoundPage from '@/pages/NotFound';

/**
 * Auth-aware not-found handler registered as `notFoundComponent` on the root route.
 *
 * - **Unauthenticated**: redirects to `/` (shows the landing page) so the user
 *   can sign in rather than seeing a dead-end 404.
 * - **Authenticated**: renders {@link NotFoundPage} inside the application
 *   {@link Layout} so the user sees a consistent shell with a clear
 *   "Content Not Found" message.
 */
function NotFoundRedirect() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      void navigate({ to: '/', replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) return <Loading data-testid="loading" withOverlay />;
  if (!user) return null; // redirect pending
  return (
    <Layout>
      <NotFoundPage />
    </Layout>
  );
}

/**
 * Root layout component that renders the route outlet and keeps the browser
 * tab title in sync with the active route.
 *
 * On every navigation, reads `useRouterState().matches` and takes the last
 * matched segment's `routeId`. It then looks up that `routeId` against the
 * combined `ROUTES` and `SYSTEM_ROUTES` arrays (matching on `r.path`) and
 * calls `setPageTitle` with the corresponding route `id`.
 */
function RootLayout() {
  const { setPageTitle } = usePageTitle();
  const matches = useRouterState({ select: (s) => s.matches });

  useEffect(() => {
    const lastMatch = matches.at(-1);
    const routeId = lastMatch?.routeId;

    if (routeId) {
      // routeId in TanStack Router includes the parent path (e.g. '/reporting-units/$ruId')
      // we need to find the RouteDescription that matches this registered route path
      const all = [...SYSTEM_ROUTES, ...ROUTES];
      const match = all.find((r) => r.path === routeId);
      if (match) {
        setPageTitle(match.id, 1);
      }
    }
  }, [matches, setPageTitle]);

  return <Outlet />;
}

/** The application root route. Hosts {@link RootLayout} and {@link NotFoundRedirect}. */
const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRedirect,
});

/**
 * Converts a {@link RouteDescription} into a TanStack Router `Route` object
 * attached to the application root route.
 *
 * @param desc - The route description to convert.
 * @returns A TanStack Router route with guards applied to the component.
 */
function toRoute(desc: RouteDescription) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path: desc.path,
    loader: desc.loader,
    // HOC guards return ComponentType which may include ComponentClass; cast to satisfy RouteComponent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: applyGuards(desc) as any,
  });
}

/** Combined TanStack Router route tree: system routes followed by feature routes. */
const routeTree = rootRoute.addChildren([...SYSTEM_ROUTES.map(toRoute), ...ROUTES.map(toRoute)]);

/**
 * The application router singleton.
 *
 * Created once at module load time from the complete route tree (system routes + feature routes).
 * Bound to the React tree via `AppRouter` and registered in the module augmentation below
 * for fully type-safe navigation hooks (`useNavigate`, `Link`, etc.) throughout the app.
 *
 * @see {@link AppRouter} for the `RouterProvider` wrapper.
 * @see the module augmentation block below for TypeScript integration.
 */
export const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <Loading data-testid="loading" withOverlay />,
  defaultErrorComponent: ({ error }) => (
    <Layout>
      <GlobalErrorPage error={error} />
    </Layout>
  ),
});

// Module augmentation: registers the router type with TanStack Router so that
// useNavigate, Link `to`, and other navigation APIs are fully type-safe across the app.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
