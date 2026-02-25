import { Grid } from '@carbon/react';
import { type FC } from 'react';
import { Navigate } from 'react-router-dom';

import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';

import './index.scss';

const NoRolePage: FC = () => {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn || !user || (user.roles?.length ?? 0) > 0) {
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
