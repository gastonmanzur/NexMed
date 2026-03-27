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
  status: z.enum(['pending', 'authorized', 'paused', 'cancelled', 'ended']).optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  userId: z.string().min(8).optional()
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

export class AdminController {
  constructor(private readonly service = new AdminService()) {}

  dashboard = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.getDashboardSummary();
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
    const filters: { status?: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'ended'; period?: 'monthly' | 'yearly'; userId?: string; page: number; limit: number } = { page: parsed.page, limit: parsed.limit };
    if (parsed.status) filters.status = parsed.status;
    if (parsed.period) filters.period = parsed.period;
    if (parsed.userId) filters.userId = parsed.userId;
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

  getMonetizationConfig = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.getMonetizationConfig();
    res.status(200).json({ success: true, data });
  };

  updateMonetizationConfig = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = monetizationSchema.parse(req.body);
    const data = await this.service.updateMonetizationConfig(parsed);
    res.status(200).json({ success: true, data });
  };
}
