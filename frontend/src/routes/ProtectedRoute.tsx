import { Navigate, useLocation } from 'react-router-dom';

import type { FamRole } from '@/context/auth/types';

import { useAuth } from '@/context/auth/useAuth';
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
  if ((user.roles?.length ?? 0) === 0) return <Navigate to="/no-role" />;
  if (
    roles &&
    !roles.some((role) => user.roles?.map((userRole) => userRole.role).includes(role.role))
  ) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
