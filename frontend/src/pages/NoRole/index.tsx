import { Grid } from '@carbon/react';
import { type FC } from 'react';
import { Navigate } from 'react-router-dom';

import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import { getUserAccessStatus } from '@/context/auth/userAccessValidation';

import './index.scss';

const NoRolePage: FC = () => {
  const { isLoggedIn, user } = useAuth();
  const accessStatus = getUserAccessStatus(user);

  if (!isLoggedIn || !user || accessStatus.kind !== 'no-role') {
    return <Navigate to="/" />;
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
