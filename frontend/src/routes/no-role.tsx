import { createFileRoute } from '@tanstack/react-router';

import NoRolePage from '@/pages/NoRole';

/**
 * Status page for authenticated users with no assigned business roles.
 * Top-level — renders **outside** the application shell. The page component
 * self-corrects (redirects to `/` or `/dashboard`) when the user's status
 * changes.
 */
export const Route = createFileRoute('/no-role')({
  component: NoRolePage,
  staticData: { title: 'No Role' },
});
