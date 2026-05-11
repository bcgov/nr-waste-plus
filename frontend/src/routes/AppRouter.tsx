import { RouterProvider } from '@tanstack/react-router';

import { router } from '@/routes/routeTree';

/**
 * Application router. The router is created once — guards handle all
 * auth/offline/redirect logic at render time rather than rebuilding the tree.
 */
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
