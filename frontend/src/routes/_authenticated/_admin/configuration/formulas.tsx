import { createFileRoute } from '@tanstack/react-router';

/**
 * Path container for the formulas subsection. No gate or component of its own
 * — `configuration.tsx` owns the subtree flag gate. Renders `<Outlet/>` by
 * default.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/formulas')({});
