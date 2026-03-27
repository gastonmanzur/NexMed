import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireActiveOrganization = false
}: {
  children: ReactElement;
  allowedRoles?: Array<'admin' | 'user'>;
  requireActiveOrganization?: boolean;
}): ReactElement => {
  const { user, loading, activeOrganizationId } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireActiveOrganization && !activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  return children;
};
