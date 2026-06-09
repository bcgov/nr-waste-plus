import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useState, type ReactElement, type ReactNode } from 'react';

/**
 * Creates a minimal TanStack Router instance for unit tests.
 *
 * The router uses an in-memory history so no browser APIs are required.
 * Use the returned instance with {@link RouterProvider} in `render()` calls.
 *
 * @param component - The root component to render inside the router.
 * @param initialPath - The initial URL path (default: `'/'`).
 * @returns A configured TanStack Router instance with an in-memory history.
 *
 * @example
 * ```tsx
 * render(<RouterProvider router={createTestRouter(() => <MyComponent />, '/dashboard')} />);
 * await waitFor(() => expect(screen.getByText('Dashboard')).toBeDefined());
 * ```
 */
export function createTestRouter(component: () => ReactElement, initialPath = '/') {
  const rootRoute = createRootRoute({ component });
  return createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

/**
 * Returns a wrapper component suitable for `renderHook`'s `wrapper` option.
 *
 * Provides a minimal TanStack Router context around the hook under test so that
 * hooks that call `useNavigate`, `useRouterState`, or `useSearch` work without
 * the full application router.
 *
 * @param initialPath - The initial URL path (default: `'/'`).
 * @returns A `RouterWrapper` component that wraps its `children` in a
 *   {@link RouterProvider} backed by an in-memory router.
 *
 * @example
 * ```tsx
 * const { result } = renderHook(() => useMyRouterHook(), {
 *   wrapper: createRouterWrapper('/my-page'),
 * });
 * ```
 */
export function createRouterWrapper(initialPath = '/') {
  return function RouterWrapper({ children }: { children: ReactNode }) {
    const [router] = useState(() => createTestRouter(() => <>{children}</>, initialPath));
    return <RouterProvider router={router} />;
  };
}

