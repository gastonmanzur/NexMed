import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: 'admin' | 'user';
  globalRole: 'super_admin' | 'user';
  email: string;
  activeOrganizationId?: string | null;
  organizationId?: string | null;
  organizationRole?: 'owner' | 'admin' | 'staff' | 'patient';
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedUser;
}
