import { Loading } from '@carbon/react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, type ComponentType } from 'react';

import { withOfflineSupport } from './guards/withOfflineSupport';
import { withProtected } from './guards/withProtected';
import { ROUTES, SYSTEM_ROUTES, type RouteDescription } from './routePaths';

import Layout from '@/components/Layout';
import { useAuth } from '@/context/auth/useAuth';
import GlobalErrorPage from '@/pages/GlobalError';
import NotFoundPage from '@/pages/NotFound';

/**
 * Auth-aware not-found handler registered as `notFoundComponent` on the root route.
 *
 * - **Unauthenticated**: redirects to `/` (shows the landing page) so the user
 *   can sign in rather than seeing a dead-end 404.
 * - **Authenticated**: renders {@link NotFoundPage} so the user sees a clear
 *   "Content Not Found" message for URLs that simply don't exist.
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
  return <NotFoundPage />;
}

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundRedirect,
});

/**
 * Composes HOC guards onto a route component based on its {@link RouteDescription}.
 *
 * Guards are applied innermost-first so that the outermost HOC in the chain runs first
 * at render time. Application order:
 *
 * 1. `withOfflineSupport` (innermost) — applied when `offlineOnly` or `offlineReady` is set.
 * 2. `withProtected` — applied when `protected: true` (with optional `roles` check).
 * 3. `guards[]` (outermost) — custom guards listed in `RouteDescription.guards`; applied
 *    left-to-right, so `guards[0]` becomes the outermost wrapper.
 *
 * @param desc - The route description containing component and guard configuration.
 * @returns The component wrapped with all applicable HOC guards.
 */
function applyGuards(desc: RouteDescription): ComponentType {
  let Component: ComponentType = desc.component;

  if (desc.offlineOnly || desc.offlineReady) {
    Component = withOfflineSupport(Component, {
      offlineOnly: desc.offlineOnly,
      offlineReady: desc.offlineReady,
    });
  }

  if (desc.protected) {
    Component = withProtected(Component, desc.roles);
  }

  for (const guard of desc.guards ?? []) {
    Component = guard(Component);
  }

  return Component;
}

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
    // HOC guards return ComponentType which may include ComponentClass; cast to satisfy RouteComponent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: applyGuards(desc) as any,
  });
}

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
