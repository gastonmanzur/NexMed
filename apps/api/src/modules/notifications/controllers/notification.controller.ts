import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { NotificationService } from '../services/notification.service.js';

const service = new NotificationService();

const listSchema = z.object({
  read: z.enum(['read', 'unread']).optional()
});

const pathSchema = z.object({
  notificationId: z.string().trim().min(1)
});

export const notificationController = {
  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = listSchema.parse(req.query);
    const data = await service.listMyNotifications(req.auth!.userId, { read: query.read });
    res.status(200).json({ success: true, data });
  },

  markRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { notificationId } = pathSchema.parse(req.params);
    const data = await service.markRead(req.auth!.userId, notificationId);
    res.status(200).json({ success: true, data });
  }
};
