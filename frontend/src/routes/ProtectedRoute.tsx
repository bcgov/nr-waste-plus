import { Navigate, useLocation } from 'react-router-dom';

import type { FamRole } from '@/context/auth/types';

import { useAuth } from '@/context/auth/useAuth';
import { getUserAccessStatus, UNAUTHORIZED_PATH } from '@/context/auth/userAccessValidation';
import { persistRedirectUrl } from '@/routes/redirectStorage';

type ProtectedRouteProps = Readonly<{
  children: React.ReactNode;
  roles?: readonly FamRole[];
}>;

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    persistRedirectUrl(`${location.pathname}${location.search}`);
    return <Navigate to="/login" replace />;
  }

  const accessStatus = getUserAccessStatus(user);

  if (accessStatus.kind === 'no-role') {
    return <Navigate to={accessStatus.redirectTo} replace />;
  }

  if (accessStatus.kind === 'role-error' && location.pathname !== UNAUTHORIZED_PATH) {
    return <Navigate to={accessStatus.redirectTo} replace />;
  }

  if (
    roles &&
    !roles.some((role) => user.roles?.map((userRole) => userRole.role).includes(role.role))
  ) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
