import { createFileRoute } from '@tanstack/react-router';

/**
 * Path container for the district-volume-tables subsection. No gate or
 * component of its own — `configuration.tsx` owns the subtree flag gate and
 * children declare their own pages. Renders `<Outlet/>` by default.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/district-volume-tables')(
  {},
);
