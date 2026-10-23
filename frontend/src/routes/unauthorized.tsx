import { createFileRoute } from '@tanstack/react-router';

import RoleErrorPage from '@/pages/RoleError';

/**
 * Status page for role-rule violations (`/unauthorized?reason=<CODE>`).
 * Top-level — renders **outside** the application shell. The `_authenticated`
 * status redirect exempts this path to avoid a loop. The page does **not**
 * call `PageTitle`, so the document title stays `APP - Unauthorized` (base
 * title from `staticData`); the visible heading is the `EmptySection` title.
 */
export const Route = createFileRoute('/unauthorized')({
  component: RoleErrorPage,
  staticData: { title: 'Unauthorized' },
});
