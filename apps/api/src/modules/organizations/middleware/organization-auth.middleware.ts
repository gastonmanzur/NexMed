import type { NextFunction, Response } from 'express';
import { AppError } from '../../../core/errors.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository.js';

const members = new OrganizationMemberRepository();

const resolveOrganizationId = (req: AuthenticatedRequest): string | null => {
  const fromParams = req.params.organizationId;
  if (typeof fromParams === 'string' && fromParams.trim().length > 0) {
    return fromParams;
  }

  const fromHeader = req.headers['x-organization-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) {
    return fromHeader;
  }

  if (typeof req.auth?.activeOrganizationId === 'string' && req.auth.activeOrganizationId.length > 0) {
    return req.auth.activeOrganizationId;
  }

  return null;
};

export const requireOrganizationMember = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.auth) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  const organizationId = resolveOrganizationId(req);
  if (!organizationId) {
    throw new AppError('ORGANIZATION_CONTEXT_REQUIRED', 400, 'Organization context is required');
  }

  if (req.auth.globalRole === 'super_admin') {
    req.auth.organizationId = organizationId;
    next();
    return;
  }

  const membership = await members.findByOrganizationAndUser(organizationId, req.auth.userId);
  if (!membership || membership.status !== 'active') {
    throw new AppError('FORBIDDEN', 403, 'You are not an active member of this organization');
  }

  req.auth.organizationId = organizationId;
  req.auth.organizationRole = membership.role;

  next();
};

export const requireOrganizationRole = (...roles: Array<'owner' | 'admin' | 'staff' | 'patient'>) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
    }

    if (req.auth.globalRole === 'super_admin') {
      next();
      return;
    }

    if (!req.auth.organizationId) {
      throw new AppError('ORGANIZATION_CONTEXT_REQUIRED', 400, 'Organization context is required');
    }

    const membership = await members.findByOrganizationAndUser(req.auth.organizationId, req.auth.userId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'You are not an active member of this organization');
    }

    if (!roles.includes(membership.role)) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient organization permissions');
    }

    req.auth.organizationRole = membership.role;
    next();
  };
};
