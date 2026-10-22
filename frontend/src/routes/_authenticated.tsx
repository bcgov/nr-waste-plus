import { Loading } from '@carbon/react';
import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useLayoutEffect } from 'react';

import Layout from '@/components/Layout';
import { useAuth } from '@/context/auth/useAuth';
import GlobalErrorPage from '@/pages/GlobalError';
import { computeAuthRedirect } from '@/routing/auth';
import { persistRedirectUrl } from '@/routing/redirectStorage';

/**
 * Route id of the unknown-URL catch-all child (`_authenticated/$.tsx`).
 * When the last match is the catch-all, the URL is unknown.
 */
const CATCH_ALL_ROUTE_ID = '/_authenticated/$';

/**
 * Authentication + status gate for all protected routes.
 *
 * Port of the legacy `withProtected` HOC as a pathless layout (DEC-004).
 * Decisions run in `useLayoutEffect` to preserve the legacy no-flash timing;
 * the pure decision logic lives in {@link computeAuthRedirect}.
 *
 * Behaviour preserved from `withProtected`:
 * - `isLoading` → Carbon `Loading` overlay.
 * - No user on a **known** protected URL → persist `pathname + search`
 *   (skipping `/login`) and hop to `/login`; the mock/e2e login flow lands on
 *   `/` (landing) with the stored redirect.
 * - No user on the **unknown-URL catch-all** → navigate to `/` without
 *   persisting (parity with the legacy `NotFoundRedirect`; DEC-014 exception).
 * - Status redirect (`no-role` / `role-error`) → navigate to the status href,
 *   except when already on `/unauthorized`.
 * - Success → one `<Layout>` around the matched child.
 */
function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname, searchStr } = useRouterState({ select: (s) => s.location });
  const isCatchAll = useRouterState({
    select: (s) => s.matches.at(-1)?.routeId === CATCH_ALL_ROUTE_ID,
  });

  const redirectTo = computeAuthRedirect({ user, isLoading, pathname });

  useLayoutEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Unknown URLs land on the public landing page without persisting a
      // redirect (the legacy 404 handler never persisted either).
      if (isCatchAll) {
        void navigate({ to: '/', replace: true });
        return;
      }
      // Guard against persisting '/login' itself: after navigate('/login')
      // fires, the router state updates before this component unmounts; the
      // skip preserves the real intended URL saved on the first pass.
      if (pathname !== '/login') {
        persistRedirectUrl(`${pathname}${searchStr}`);
      }
      void navigate({ href: '/login', replace: true });
      return;
    }

    if (redirectTo) {
      void navigate({ href: redirectTo.href, replace: true });
    }
  }, [isLoading, user, pathname, searchStr, navigate, redirectTo, isCatchAll]);

  if (isLoading || !user || redirectTo) {
    return <Loading data-testid="loading" withOverlay />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/**
 * Pathless authentication layout. Errors raised below this point render
 * exactly one `Layout` shell (DEC-012).
 */
export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  errorComponent: ({ error }) => (
    <Layout>
      <GlobalErrorPage error={error} />
    </Layout>
  ),
});
