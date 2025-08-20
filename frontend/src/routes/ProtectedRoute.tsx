import { Navigate } from 'react-router-dom';

import { useAuth } from '@/context/auth/useAuth';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.some((role) => user.roles?.includes(role))) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
