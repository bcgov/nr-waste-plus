import { Loading } from '@carbon/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { clearPersistedRedirect, readPersistedRedirect } from '@/routing/redirectStorage';
import { completeSignIn } from '@/services/keycloak';

/**
 * Completes the OIDC authorization-code exchange.
 *
 * This route is intentionally PUBLIC — the session does not exist until this
 * component's exchange creates it. It must stay outside the authenticated
 * route tree; a `*` catch-all would otherwise bounce the `?code=&state=`
 * round-trip back to the app before the exchange can run.
 *
 * The authorization code is single-use. The ref guard keeps React StrictMode's
 * dev double-mount from spending the code twice.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    void (async () => {
      try {
        await completeSignIn();
        const target = readPersistedRedirect() ?? '/dashboard';
        clearPersistedRedirect();
        await navigate({ href: target, replace: true });
      } catch {
        // Failed exchange — land on the public landing page unauthenticated.
        await navigate({ href: '/', replace: true });
      }
    })();
  }, [navigate]);

  return <Loading data-testid="auth-callback-loading" withOverlay />;
}

export const Route = createFileRoute('/authCallback')({
  component: AuthCallback,
  staticData: {
    title: 'Signing in',
  },
});
