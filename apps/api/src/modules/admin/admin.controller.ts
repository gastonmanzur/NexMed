import type { Response } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../core/api-response.js';
import { AppError } from '../../core/errors.js';
import type { AuthenticatedRequest } from '../auth/types/auth-request.js';
import { AdminService } from './admin.service.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const usersQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['admin', 'user']).optional(),
  provider: z.enum(['local', 'google']).optional(),
  emailVerified: z.enum(['true', 'false']).optional(),
  hasAvatar: z.enum(['true', 'false']).optional()
});

const updateRoleSchema = z.object({ role: z.enum(['admin', 'user']) });

const paymentsQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process']).optional(),
  type: z.enum(['one_time', 'subscription']).optional(),
  userId: z.string().min(8).optional()
});

const subscriptionsQuerySchema = paginationSchema.extend({
  status: z.enum(['trial', 'active', 'past_due', 'suspended', 'canceled']).optional(),
  planId: z.string().min(8).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const notificationSchema = z.object({
  targetUserId: z.string().min(8),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500)
});

const avatarQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  hasAvatar: z.enum(['true', 'false']).optional()
});

const monetizationSchema = z.object({
  monetizationMode: z.enum(['one_time_only', 'subscriptions_only', 'both']),
  subscriptionPeriodMode: z.enum(['monthly', 'yearly', 'both'])
});


const feedbackQuerySchema = paginationSchema.extend({
  status: z.enum(['new', 'triaged', 'planned', 'resolved', 'wont_fix']).optional(),
  category: z.enum(['bug', 'ux', 'feature_request', 'content', 'support', 'other']).optional()
});

const updateFeedbackSchema = z.object({
  status: z.enum(['new', 'triaged', 'planned', 'resolved', 'wont_fix']),
  adminNotes: z.string().trim().max(2000).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional()
});

const updateOrganizationBetaSchema = z.object({
  betaEnabled: z.boolean(),
  betaNotes: z.string().trim().max(500).optional()
});


const listOrganizationsQuerySchema = paginationSchema.extend({
  status: z.enum(['onboarding', 'active', 'inactive', 'suspended', 'blocked']).optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'past_due', 'suspended', 'canceled']).optional(),
  planId: z.string().min(8).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  betaEnabled: z.enum(['true', 'false']).optional()
});

const updateOrganizationStatusSchema = z.object({
  status: z.enum(['onboarding', 'active', 'inactive', 'suspended', 'blocked']),
  betaEnabled: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional()
});

const planCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  monthlyPrice: z.number().min(0),
  currency: z.string().trim().min(3).max(10),
  maxProfessionals: z.number().int().min(1),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  isRecommended: z.boolean().optional()
});

const planUpdateSchema = planCreateSchema.partial();

const discountCreateSchema = z.object({
  code: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9_-]+$/),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  currency: z.string().trim().min(3).max(10).optional(),
  appliesToPlanIds: z.array(z.string().trim().min(1)).optional(),
  onlyForNewOrganizations: z.boolean().optional(),
  onlyDuringTrial: z.boolean().optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  maxRedemptionsPerOrganization: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional()
});

const discountUpdateSchema = z.object({
  code: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  currency: z.string().trim().min(3).max(10).nullable().optional(),
  appliesToPlanIds: z.array(z.string().trim().min(1)).optional(),
  onlyForNewOrganizations: z.boolean().optional(),
  onlyDuringTrial: z.boolean().optional(),
  maxRedemptions: z.number().int().min(1).nullable().optional(),
  maxRedemptionsPerOrganization: z.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional()
});

export class AdminController {
  constructor(private readonly service = new AdminService()) {}

  dashboard = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.getDashboardSummary();
    res.status(200).json({ success: true, data });
  };

  summary = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.getGlobalSummary();
    res.status(200).json({ success: true, data });
  };

  listUsers = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = usersQuerySchema.parse(req.query);
    const filters: { search?: string; role?: 'admin' | 'user'; provider?: 'local' | 'google'; emailVerified?: boolean; hasAvatar?: boolean; page: number; limit: number } = { page: parsed.page, limit: parsed.limit };
    if (parsed.search) filters.search = parsed.search;
    if (parsed.role) filters.role = parsed.role;
    if (parsed.provider) filters.provider = parsed.provider;
    if (parsed.emailVerified) filters.emailVerified = parsed.emailVerified === 'true';
    if (parsed.hasAvatar) filters.hasAvatar = parsed.hasAvatar === 'true';
    const data = await this.service.listUsers(filters);
    res.status(200).json({ success: true, data });
  };

  updateUserRole = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsedBody = updateRoleSchema.parse(req.body);
    const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!targetUserId) {
      throw new AppError('INVALID_USER_ID', 400, 'Missing user id');
    }
    const data = await this.service.updateUserRole(req.auth!.userId, targetUserId, parsedBody.role);
    res.status(200).json({ success: true, data });
  };

  listPayments = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = paymentsQuerySchema.parse(req.query);
    const filters: { status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'in_process'; type?: 'one_time' | 'subscription'; userId?: string; page: number; limit: number } = { page: parsed.page, limit: parsed.limit };
    if (parsed.status) filters.status = parsed.status;
    if (parsed.type) filters.type = parsed.type;
    if (parsed.userId) filters.userId = parsed.userId;
    const data = await this.service.listPayments(filters);
    res.status(200).json({ success: true, data });
  };

  listSubscriptions = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = subscriptionsQuerySchema.parse(req.query);
    const filters: {
      status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
      planId?: string;
      search?: string;
      page: number;
      limit: number;
    } = { page: parsed.page, limit: parsed.limit };
    if (parsed.status) filters.status = parsed.status;
    if (parsed.planId) filters.planId = parsed.planId;
    if (parsed.search) filters.search = parsed.search;
    const data = await this.service.listSubscriptions(filters);
    res.status(200).json({ success: true, data });
  };

  sendNotification = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = notificationSchema.parse(req.body);
    const data = await this.service.sendNotification({
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      targetUserId: parsed.targetUserId,
      title: parsed.title,
      body: parsed.body
    });
    res.status(200).json({ success: true, data });
  };

  listAvatars = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = avatarQuerySchema.parse(req.query);
    const filters: { search?: string; hasAvatar?: boolean; page: number; limit: number } = { page: parsed.page, limit: parsed.limit, hasAvatar: true };
    if (parsed.search) filters.search = parsed.search;
    if (parsed.hasAvatar) filters.hasAvatar = parsed.hasAvatar === 'true';
    const data = await this.service.listAvatars(filters);
    res.status(200).json({ success: true, data });
  };

  deleteAvatar = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!targetUserId) {
      throw new AppError('INVALID_USER_ID', 400, 'Missing user id');
    }
    await this.service.deleteAvatar(req.auth!.userId, targetUserId, req.auth!.role);
    res.status(200).json({ success: true, data: { message: 'Avatar deleted' } });
  };


  listFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = feedbackQuerySchema.parse(req.query);
    const filters: {
      page: number;
      limit: number;
      status?: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
      category?: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
    } = {
      page: parsed.page,
      limit: parsed.limit
    };

    if (parsed.status) filters.status = parsed.status;
    if (parsed.category) filters.category = parsed.category;

    const data = await this.service.listFeedback(filters);
    res.status(200).json({ success: true, data });
  };

  updateFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsedBody = updateFeedbackSchema.parse(req.body);
    const feedbackId = Array.isArray(req.params.feedbackId) ? req.params.feedbackId[0] : req.params.feedbackId;
    if (!feedbackId) {
      throw new AppError('INVALID_FEEDBACK_ID', 400, 'Missing feedback id');
    }

    const data = await this.service.updateFeedback({
      feedbackId,
      status: parsedBody.status,
      adminNotes: parsedBody.adminNotes,
      severity: parsedBody.severity
    });

    res.status(200).json({ success: true, data });
  };


  listOrganizations = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = listOrganizationsQuerySchema.parse(req.query);
    const filters: {
      page: number;
      limit: number;
      status?: 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';
      subscriptionStatus?: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
      planId?: string;
      search?: string;
      betaEnabled?: boolean;
    } = {
      page: parsed.page,
      limit: parsed.limit
    };

    if (parsed.status) filters.status = parsed.status;
    if (parsed.subscriptionStatus) filters.subscriptionStatus = parsed.subscriptionStatus;
    if (parsed.planId) filters.planId = parsed.planId;
    if (parsed.search) filters.search = parsed.search;
    if (parsed.betaEnabled) filters.betaEnabled = parsed.betaEnabled === 'true';

    const data = await this.service.listOrganizations(filters);
    res.status(200).json({ success: true, data });
  };

  getOrganizationDetail = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId;
    if (!organizationId) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'Missing organization id');
    }
    const data = await this.service.getOrganizationDetail(organizationId);
    res.status(200).json({ success: true, data });
  };

  updateOrganizationStatus = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsedBody = updateOrganizationStatusSchema.parse(req.body);
    const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId;
    if (!organizationId) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'Missing organization id');
    }

    const data = await this.service.updateOrganizationStatus({
      organizationId,
      status: parsedBody.status,
      ...(parsedBody.betaEnabled !== undefined ? { betaEnabled: parsedBody.betaEnabled } : {}),
      ...(parsedBody.onboardingCompleted !== undefined ? { onboardingCompleted: parsedBody.onboardingCompleted } : {})
    });

    res.status(200).json({ success: true, data });
  };

  updateOrganizationBeta = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsedBody = updateOrganizationBetaSchema.parse(req.body);
    const organizationId = Array.isArray(req.params.organizationId) ? req.params.organizationId[0] : req.params.organizationId;
    if (!organizationId) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'Missing organization id');
    }

    const data = await this.service.updateOrganizationBeta({
      organizationId,
      betaEnabled: parsedBody.betaEnabled,
      betaNotes: parsedBody.betaNotes
    });

    res.status(200).json({ success: true, data });
  };

  getMonetizationConfig = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.getMonetizationConfig();
    res.status(200).json({ success: true, data });
  };

  updateMonetizationConfig = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = monetizationSchema.parse(req.body);
    const data = await this.service.updateMonetizationConfig(parsed);
    res.status(200).json({ success: true, data });
  };

  listPlans = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.listPlans();
    res.status(200).json({ success: true, data });
  };

  createPlan = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const body = planCreateSchema.parse(req.body);
    const data = await this.service.createPlan(body);
    res.status(201).json({ success: true, data });
  };

  updatePlan = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const body = planUpdateSchema.parse(req.body);
    const planId = Array.isArray(req.params.planId) ? req.params.planId[0] : req.params.planId;
    if (!planId) {
      throw new AppError('INVALID_PLAN_ID', 400, 'Missing plan id');
    }
    const data = await this.service.updatePlan(planId, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.monthlyPrice !== undefined ? { monthlyPrice: body.monthlyPrice } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.maxProfessionals !== undefined ? { maxProfessionals: body.maxProfessionals } : {}),
      ...(body.description !== undefined ? { description: body.description ?? null } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.isRecommended !== undefined ? { isRecommended: body.isRecommended } : {})
    });
    res.status(200).json({ success: true, data });
  };

  listDiscounts = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.listDiscounts();
    res.status(200).json({ success: true, data });
  };

  createDiscount = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const body = discountCreateSchema.parse(req.body);
    const data = await this.service.createDiscount(body);
    res.status(201).json({ success: true, data });
  };

  getDiscount = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const discountId = Array.isArray(req.params.discountId) ? req.params.discountId[0] : req.params.discountId;
    if (!discountId) {
      throw new AppError('INVALID_DISCOUNT_ID', 400, 'Missing discount id');
    }
    const data = await this.service.getDiscountById(discountId);
    res.status(200).json({ success: true, data });
  };

  updateDiscount = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const body = discountUpdateSchema.parse(req.body);
    const discountId = Array.isArray(req.params.discountId) ? req.params.discountId[0] : req.params.discountId;
    if (!discountId) {
      throw new AppError('INVALID_DISCOUNT_ID', 400, 'Missing discount id');
    }
    const data = await this.service.updateDiscount(discountId, {
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
      ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.appliesToPlanIds !== undefined ? { appliesToPlanIds: body.appliesToPlanIds } : {}),
      ...(body.onlyForNewOrganizations !== undefined
        ? { onlyForNewOrganizations: body.onlyForNewOrganizations }
        : {}),
      ...(body.onlyDuringTrial !== undefined ? { onlyDuringTrial: body.onlyDuringTrial } : {}),
      ...(body.maxRedemptions !== undefined ? { maxRedemptions: body.maxRedemptions } : {}),
      ...(body.maxRedemptionsPerOrganization !== undefined
        ? { maxRedemptionsPerOrganization: body.maxRedemptionsPerOrganization }
        : {}),
      ...(body.startsAt !== undefined ? { startsAt: body.startsAt } : {}),
      ...(body.endsAt !== undefined ? { endsAt: body.endsAt } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
    });
    res.status(200).json({ success: true, data });
  };
}
