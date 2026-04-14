import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { GlobalRole, OrganizationMemberRole } from '@starter/shared-types';

export const ProtectedRoute = ({
  children,
  allowedRoles,
  allowedGlobalRoles,
  allowedOrganizationRoles,
  requireActiveOrganization = false
}: {
  children: ReactElement;
  allowedRoles?: Array<'admin' | 'user'>;
  allowedGlobalRoles?: GlobalRole[];
  allowedOrganizationRoles?: OrganizationMemberRole[];
  requireActiveOrganization?: boolean;
}): ReactElement => {
  const { user, loading, activeOrganizationId, memberships } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedGlobalRoles && !allowedGlobalRoles.includes(user.globalRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireActiveOrganization && !activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  if (allowedOrganizationRoles) {
    const membership = memberships.find((item) => item.organizationId === activeOrganizationId && item.status === 'active');
    if (!membership || !allowedOrganizationRoles.includes(membership.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};
