import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

/**
 * Creates a minimal TanStack Router instance for unit tests.
 *
 * @param component - The root component to render inside the router.
 * @param initialPath - The initial URL path (default: '/').
 * @returns A configured TanStack Router instance.
 */
export function createTestRouter(component: () => JSX.Element, initialPath = '/') {
  const rootRoute = createRootRoute({ component });
  return createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

/**
 * Returns a wrapper component suitable for `renderHook`'s `wrapper` option.
 * Provides a minimal TanStack Router context around the hook under test.
 *
 * @param initialPath - The initial URL path (default: '/').
 */
export function createRouterWrapper(initialPath = '/') {
  return function RouterWrapper({ children }: { children: ReactNode }) {
    const [router] = useState(() => createTestRouter(() => <>{children}</>, initialPath));
    return <RouterProvider router={router} />;
  };
}
