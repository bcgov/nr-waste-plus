import type { QueryClient } from '@tanstack/react-query';

/**
 * Context injected into every TanStack Router route via
 * `createRootRouteWithContext<AppRouterContext>()`.
 *
 * Kept in its own module — outside the route tree and outside `router.tsx` —
 * so route files and loaders can import the context type without creating a
 * runtime import cycle through the generated route tree.
 */
export type AppRouterContext = {
  /** Shared TanStack Query client used by route loaders (`ensureQueryData`). */
  queryClient: QueryClient;
};
