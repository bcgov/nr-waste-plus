import { Navigate } from 'react-router-dom';

import { useAuth } from '@/context/auth/useAuth';

import type { FamRole } from '@/context/auth/types';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: FamRole[];
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (
    roles &&
    !roles.some((role) => user.roles?.map((userRole) => userRole.role).includes(role.role))
  ) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
