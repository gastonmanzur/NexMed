import type { Response } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../../core/api-response.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { FeedbackService } from '../services/feedback.service.js';

const createFeedbackSchema = z.object({
  category: z.enum(['bug', 'ux', 'feature_request', 'content', 'support', 'other']),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  message: z.string().trim().min(5).max(2000),
  pagePath: z
    .string()
    .trim()
    .max(300)
    .regex(/^\//, 'pagePath must start with /')
    .optional(),
  relatedEntityType: z.string().trim().min(1).max(80).optional(),
  relatedEntityId: z.string().trim().min(1).max(120).optional(),
  organizationId: z.string().trim().min(1).optional()
});

const service = new FeedbackService();

export const feedbackController = {
  create: async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsed = createFeedbackSchema.parse(req.body);

    const data = await service.createFeedback({
      userId: req.auth!.userId,
      globalRole: req.auth!.globalRole,
      organizationId: parsed.organizationId,
      category: parsed.category,
      severity: parsed.severity,
      title: parsed.title,
      message: parsed.message,
      pagePath: parsed.pagePath,
      relatedEntityType: parsed.relatedEntityType,
      relatedEntityId: parsed.relatedEntityId
    });

    res.status(201).json({ success: true, data });
  }
};
