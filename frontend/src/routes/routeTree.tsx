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
import GlobalErrorPage from '@/pages/GlobalError';

function NotFoundRedirect() {
  const navigate = useNavigate();
  useEffect(() => void navigate({ to: '/', replace: true }), [navigate]);
  return null;
}

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundRedirect,
});

/**
 * Composes HOC guards onto a route component based on its RouteDescription.
 *
 * Application order (first applied = innermost = runs last):
 *   component → withOfflineSupport → withProtected → custom guards[] (outermost)
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

export const router = createRouter({
  routeTree,
  defaultPendingComponent: () => <Loading data-testid="loading" withOverlay />,
  defaultErrorComponent: ({ error }) => (
    <Layout>
      <GlobalErrorPage error={error} />
    </Layout>
  ),
});

// Enables type-safe useNavigate, Link to, etc. across the app.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
