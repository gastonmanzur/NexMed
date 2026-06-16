import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: 'admin' | 'user';
  globalRole: 'super_admin' | 'user';
  email: string;
  activeOrganizationId?: string | null;
  organizationId?: string | null;
  organizationRole?: 'owner' | 'admin' | 'staff' | 'patient' | 'professional';
  professionalId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedUser;
}
