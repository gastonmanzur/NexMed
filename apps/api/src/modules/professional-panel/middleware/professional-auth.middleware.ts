import type { NextFunction, Response } from 'express';
import { AppError } from '../../../core/errors.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { OrganizationMemberRepository } from '../../organizations/repositories/organization-member.repository.js';

const members = new OrganizationMemberRepository();

const resolveOrganizationId = (req: AuthenticatedRequest): string | null => {
  const fromHeader = req.headers['x-organization-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim().length > 0) return fromHeader;
  if (typeof req.auth?.activeOrganizationId === 'string' && req.auth.activeOrganizationId.length > 0) return req.auth.activeOrganizationId;
  return null;
};

export const requireProfessionalMembership = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.auth) throw new AppError('UNAUTHORIZED', 401, 'Authentication required');

  const organizationId = resolveOrganizationId(req);
  if (!organizationId) throw new AppError('ORGANIZATION_CONTEXT_REQUIRED', 400, 'Organization context is required');

  const membership = await members.findByOrganizationAndUser(organizationId, req.auth.userId);
  if (!membership || membership.status !== 'active' || membership.role !== 'professional') {
    throw new AppError('FORBIDDEN', 403, 'Professional access is required');
  }

  const professionalId = membership.professionalId ? membership.professionalId.toString() : null;
  if (!professionalId) throw new AppError('PROFESSIONAL_LINK_REQUIRED', 403, 'Professional membership is not linked to a professional');

  req.auth.organizationId = organizationId;
  req.auth.organizationRole = 'professional';
  req.auth.professionalId = professionalId;
  next();
};
