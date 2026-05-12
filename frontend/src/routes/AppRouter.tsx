import { RouterProvider } from '@tanstack/react-router';

import { router } from '@/routes/routeTree';

/**
 * Thin wrapper that mounts the application {@link RouterProvider} bound to the
 * shared {@link router} singleton.
 *
 * The router is created once at module load in `routeTree.tsx`; this component
 * simply connects it to the React tree. All auth, offline, and redirect logic
 * is handled inside the HOC guards applied to each route, not here.
 *
 * @returns A `RouterProvider` element using the application router singleton.
 */
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
