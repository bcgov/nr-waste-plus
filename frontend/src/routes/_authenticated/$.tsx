import { createFileRoute } from '@tanstack/react-router';

import NotFoundPage from '@/pages/NotFound';

/**
 * Unknown-URL catch-all for authenticated users (DEC-014).
 *
 * Renders `NotFoundPage` ("Content Not Found") inside the `_authenticated`
 * shell — exactly one `Layout`. Static routes always outrank this catch-all.
 * Unauthenticated visitors never see this component: the parent
 * `_authenticated` layout detects the catch-all match and redirects to `/`
 * (landing) without persisting a redirect, preserving the legacy
 * `NotFoundRedirect` behaviour.
 */
function CatchAllNotFound() {
  return <NotFoundPage />;
}

export const Route = createFileRoute('/_authenticated/$')({
  component: CatchAllNotFound,
});
