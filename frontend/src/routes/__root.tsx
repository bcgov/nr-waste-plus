import { Loading } from '@carbon/react';
import {
  createRootRouteWithContext,
  Outlet,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect } from 'react';

import Layout from '@/components/Layout';
import { useAuth } from '@/context/auth/useAuth';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';
import GlobalErrorPage from '@/pages/GlobalError';
import NotFoundPage from '@/pages/NotFound';
import { type AppRouterContext } from '@/routerContext';
import { resolveRouteTitle, type RouteLike } from '@/routing/nav/routeMetadata';
import DevTools from '@/utils/devtools/DevTools';

/**
 * Auth-aware not-found handler for the root route's `notFoundComponent`.
 *
 * Serves **explicit** `throw notFound()` markers (feature-flag gates); unknown
 * URLs are claimed by the `_authenticated/$` catch-all once S2 lands.
 *
 * - **Unauthenticated**: redirects to `/` (landing) so the user can sign in
 *   rather than seeing a dead-end 404.
 * - **Authenticated**: renders {@link NotFoundPage} inside the application
 *   {@link Layout} with a "Content Not Found" message.
 */
function AuthAwareNotFound() {
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
 * Root layout: renders the route outlet, keeps the document title in sync with
 * the active route's static metadata, and hosts DEV-only devtools.
 *
 * Title sync resolves the **last match's** metadata via the ancestor walk in
 * {@link resolveRouteTitle}: leaf `staticData.title` first, then
 * `nav.label`, then ancestors (nearest wins). When nothing declares a title,
 * the document title is left untouched — parity with the legacy registry
 * lookup for unmatched route ids.
 */
function RootLayout() {
  const { setPageTitle } = usePageTitle();
  const router = useRouter();
  const matches = useRouterState({ select: (s) => s.matches });

  useEffect(() => {
    const lastMatch = matches.at(-1);
    if (!lastMatch) return;
    const route = (router as unknown as { routesById: Record<string, RouteLike> }).routesById[
      lastMatch.routeId
    ];
    const title = resolveRouteTitle(route);
    if (title) {
      setPageTitle(title, 1);
    }
  }, [matches, router, setPageTitle]);

  return (
    <>
      <Outlet />
      {import.meta.env.DEV && import.meta.env.MODE !== 'test' && <DevTools />}
    </>
  );
}

/**
 * The application root route.
 *
 * `errorComponent` is `Layout`-wrapped (DEC-012): errors raised below the root
 * render exactly one application shell, while the router-level
 * `defaultErrorComponent` in `router.tsx` stays bare as the last-resort
 * fallback.
 */
export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootLayout,
  notFoundComponent: AuthAwareNotFound,
  errorComponent: ({ error }) => (
    <Layout>
      <GlobalErrorPage error={error} />
    </Layout>
  ),
});
