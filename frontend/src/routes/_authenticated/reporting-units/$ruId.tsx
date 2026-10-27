import { createFileRoute } from '@tanstack/react-router';

/**
 * Pathless-content container for `/reporting-units/$ruId`.
 *
 * Carries no gate or component of its own — children (`index.tsx` details,
 * `$blockId.tsx`) declare their own flag gates. With no `component`, TanStack
 * renders `<Outlet/>`.
 */
export const Route = createFileRoute('/_authenticated/reporting-units/$ruId')({});
