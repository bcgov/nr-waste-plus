import { getUserAccessStatus, UNAUTHORIZED_PATH } from '@/context/auth/userAccessValidation';

import type { FamLoginUser, FamRole } from '@/types/auth.types';
import type { Role } from '@/types/auth.types';

/**
 * Normalized redirect decision consumed by the `_authenticated` layout.
 * `null` means "no redirect — render the outlet".
 */
export type AuthRedirect = { href: string } | null;

/**
 * Inputs for {@link computeAuthRedirect}.
 */
type ComputeAuthRedirectInput = {
  /** Resolved auth user, or `undefined` while signed out. */
  user: FamLoginUser | undefined;
  /** `true` while the auth context is resolving; suppresses all decisions. */
  isLoading: boolean;
  /** Current pathname, used for the `/unauthorized` and `/login` exemptions. */
  pathname: string;
};

/**
 * Pure port of the legacy `computeRedirectTo` decision table
 * (`withProtected.tsx`), returning a typed redirect instead of a raw string.
 *
 * Decision order (must match the legacy guard exactly):
 * 1. `isLoading` → `null` (the layout renders the loading overlay).
 * 2. No user → `/login` (skipped when already on `/login` — the login hop is
 *    external/Cognito and re-entering would loop).
 * 3. `no-role` status → `/no-role`.
 * 4. `role-error` status → `/unauthorized?reason=<CODE>`, **except** when the
 *    user is already on `/unauthorized` (loop guard).
 * 5. Optional role check is handled by {@link hasAnyRole} in the role layouts.
 *
 * @param input - Auth state and current pathname.
 * @returns `{ href }` to redirect to, or `null` to render the outlet.
 */
export const computeAuthRedirect = ({
  user,
  isLoading,
  pathname,
}: ComputeAuthRedirectInput): AuthRedirect => {
  if (isLoading) return null;

  if (!user) {
    return pathname === '/login' ? null : { href: '/login' };
  }

  const status = getUserAccessStatus(user);
  if (status.kind === 'no-role') return { href: status.redirectTo };
  if (status.kind === 'role-error') {
    if (pathname === UNAUTHORIZED_PATH) return null;
    return { href: status.redirectTo };
  }

  return null;
};

/**
 * Any-of role check: `true` when the user holds at least one of the required
 * `Role` values. Compares `Role` values against `FamRole.role` (the user's
 * roles are `FamRole` objects, not the reference's string union).
 *
 * @param userRoles - The authenticated user's `FamRole` assignments.
 * @param required - Required `Role` values; empty means "no restriction".
 * @returns `true` when access is granted.
 */
export const hasAnyRole = (
  userRoles: readonly FamRole[] | undefined,
  required: readonly Role[],
): boolean => {
  if (required.length === 0) return true;
  const userRoleSet = new Set((userRoles ?? []).map((assignment) => assignment.role));
  return required.some((role) => userRoleSet.has(role));
};
