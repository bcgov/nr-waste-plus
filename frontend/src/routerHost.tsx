import { RouterProvider } from '@tanstack/react-router';

import { router } from '@/router';
import LegacyAppRouter from '@/routing/legacy/AppRouter';

/**
 * TEMPORARY build-time router switch (DEC-013).
 *
 * Selects exactly one router implementation at **build time**:
 *
 * - `legacy` (default; any unset/unknown value) mounts the pre-migration
 *   `RouteDescription[]` router from `@/routing/legacy/AppRouter`.
 * - `next` (`VITE_ROUTER_IMPL=next`) mounts the file-based tree via
 *   `@/router`.
 *
 * Both implementations may be present in the bundle during the migration, but
 * only one is ever mounted. There is no runtime toggle, query parameter, or
 * localStorage flag, and no dual mount. The switch — and the legacy tree — are
 * deleted at the S7 cutover.
 */
const useNextRouter = import.meta.env.VITE_ROUTER_IMPL === 'next';

export default function RouterHost() {
  return useNextRouter ? <RouterProvider router={router} /> : <LegacyAppRouter />;
}
