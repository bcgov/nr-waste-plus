import { Navigate, useLocation } from 'react-router-dom';

import type { FamRole } from '@/context/auth/types';

import { useAuth } from '@/context/auth/useAuth';

type ProtectedRouteProps = Readonly<{
  children: React.ReactNode;
  roles?: readonly FamRole[];
}>;

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  const captureReturnTo = () => {
    const returnTo = `${location.pathname}${location.search}`;
    sessionStorage.setItem('returnTo', returnTo);
    localStorage.setItem('returnToFallback', returnTo);
    sessionStorage.setItem('redirectAfterLogin', returnTo);
    localStorage.setItem('redirectAfterLoginFallback', returnTo);
  };

  if (!user) {
    captureReturnTo();
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
