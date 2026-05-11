import { Grid } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import { getUserAccessStatus } from '@/context/auth/userAccessValidation';

import './index.scss';

/**
 * Explains that the current authenticated user does not have any FAM roles assigned.
 *
 * @returns The no-role page or a redirect when the user state does not match this case.
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
