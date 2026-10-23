import { Loading } from '@carbon/react';
import { createBrowserHistory, createRouter, type RouterHistory } from '@tanstack/react-router';

import { queryClient } from '@/config/react-query/config';
import GlobalErrorPage from '@/pages/GlobalError';
import { searchParamCodec } from '@/routing/searchParams';

// Side-effect import: loads the `StaticDataRouteOption` module augmentation so
// route `staticData` is fully typed everywhere the router is used.
import '@/routing/staticData';

import { type AppRouterContext } from './routerContext';
import { routeTree } from './routeTree.gen';

/**
 * Router-wide defaults shared by every router created through
 * {@link createAppRouter}. Mirrors the legacy router's behavior:
 *
 * - `defaultErrorComponent` is intentionally **bare** (DEC-012): the root and
 *   `_authenticated` routes supply their own `Layout`-wrapped error components,
 *   so a bare fallback here avoids rendering a double application shell.
 * - Pending/preload options per DEC-015 (pending timing prevents overlay
 *   flicker; preload reuses loaded data for 30s).
 */
const routerDefaults = {
  defaultPendingComponent: () => <Loading data-testid="loading" withOverlay />,
  defaultPendingMs: 250,
  defaultPendingMinMs: 300,
  defaultPreload: 'intent' as const,
  defaultPreloadStaleTime: 30_000,
  defaultErrorComponent: ({ error }: { error: unknown }) => <GlobalErrorPage error={error} />,
};

/**
 * Creates an application router from the generated file-based route tree.
 * Production uses the {@link router} singleton below; tests pass
 * `createMemoryHistory({ initialEntries })` via `options.history` to exercise
 * the real tree without a browser.
 *
 * This module owns the single `Register` augmentation (below), so
 * `useNavigate`/`Link` types resolve against the generated route tree.
 *
 * @param context - Router context (currently `{ queryClient }`).
 * @param options - Optional router overrides; `history` swaps browser history
 *   for memory history in tests.
 * @returns A configured TanStack Router instance.
 */
export const createAppRouter = (context: AppRouterContext, options?: { history?: RouterHistory }) =>
  createRouter({
    routeTree,
    context,
    ...routerDefaults,
    // URL search params use a plain, human-readable format (see
    // `@/routing/searchParams`): strings unquoted, arrays comma-joined,
    // booleans `true`/`false`, with legacy JSON-encoded URLs still parsed.
    ...searchParamCodec,
    ...options,
  });

/**
 * The application router singleton used by the root `App` component.
 * Built once at module load with browser history and the shared query client.
 */
export const router = createAppRouter({ queryClient }, { history: createBrowserHistory() });

// Module augmentation: registers the file-based router with TanStack Router so
// `useNavigate`, `Link to`, and other navigation APIs are fully type-safe
// across the app. This is the single `Register` — the legacy router's
// augmentation was removed because the generated tree's `FileRoutesByPath`
// augmentation and a second `Register` cannot coexist (the navigation `to`
// union collapses to `never` when both are present).
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
