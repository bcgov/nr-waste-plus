import { Grid } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import { getUserAccessStatus } from '@/context/auth/userAccessValidation';

import './index.scss';

/**
 * No-Role page — shown when an authenticated user has no FAM application roles.
 *
 * On mount, evaluates the user's access status via {@link getUserAccessStatus}.
 * If the status is anything other than `'no-role'` (e.g. user is not logged in,
 * user has valid roles, or user is an admin), a `useLayoutEffect` redirect to `/`
 * fires synchronously before the first paint, and the component renders `null`.
 *
 * This prevents the page from flashing for users who should not see it (e.g.
 * after a hard reload when the auth state is rehydrating).
 *
 * @returns The unauthorised-access grid, or `null` while redirecting.
 */
const NoRolePage: FC = () => {
  const { isLoggedIn, user } = useAuth();
  const accessStatus = getUserAccessStatus(user);
  const navigate = useNavigate();
  const shouldRedirect = !isLoggedIn || !user || accessStatus.kind !== 'no-role';

  useLayoutEffect(() => {
    if (shouldRedirect) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void navigate({ to: '/' as any, replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return null;
  }

  return (
    <Grid fullWidth className="unauthorized-block">
      <PageTitle
        title="Unauthorized Access"
        subtitle="You don't have FAM authorization to access this system"
      />
    </Grid>
  );
};

export default NoRolePage;
