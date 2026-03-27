import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../../core/api-response.js';
import { PaymentsService } from '../services/payments.service.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';

const oneTimeSchema = z.object({
  title: z.string().min(3).max(120),
  amount: z.number().positive(),
  currency: z.string().default('ARS')
});

const subscriptionSchema = z.object({
  planCode: z.string().min(2).max(40),
  title: z.string().min(3).max(120),
  amount: z.number().positive(),
  currency: z.string().default('ARS'),
  period: z.enum(['monthly', 'yearly'])
});

const subscriptionStatusQuerySchema = z.object({
  subscriptionId: z.string().min(1).optional(),
  planCode: z.string().min(2).max(40).optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  sync: z
    .union([z.boolean(), z.string()])
    .transform((value) => (typeof value === 'string' ? value.toLowerCase() === 'true' : value))
    .optional()
});

const webhookSchema = z.object({
  topic: z.string().optional(),
  type: z.string().optional(),
  data: z.object({ id: z.union([z.string(), z.number()]).transform(String).optional() }).optional(),
  id: z.union([z.string(), z.number()]).transform(String).optional()
});

export class PaymentsController {
  constructor(private readonly service = new PaymentsService()) {}

  createOneTime = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const body = oneTimeSchema.parse(req.body);
    const result = await this.service.createOneTimePayment({
      userId: req.auth!.userId,
      title: body.title,
      amount: body.amount,
      currency: body.currency
    });
    res.status(201).json({ success: true, data: result });
  };

  createSubscription = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const body = subscriptionSchema.parse(req.body);
    const result = await this.service.createSubscription({
      userId: req.auth!.userId,
      planCode: body.planCode,
      title: body.title,
      amount: body.amount,
      currency: body.currency,
      period: body.period
    });
    res.status(201).json({ success: true, data: result });
  };

  getOrderStatus = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const orderIdRaw = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const orderId = z.string().min(1).parse(orderIdRaw);
    const syncRaw = Array.isArray(req.query.sync) ? req.query.sync[0] : req.query.sync;
    const syncWithProvider = typeof syncRaw === 'string' ? syncRaw.toLowerCase() === 'true' : false;
    const result = await this.service.getOrderStatus(
      orderId,
      { userId: req.auth!.userId, role: req.auth!.role },
      { syncWithProvider }
    );
    res.status(200).json({ success: true, data: result });
  };

  getMySubscriptionStatus = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsedQuery = subscriptionStatusQuerySchema.parse(req.query);
    const result = await this.service.getUserSubscriptionStatus({
      userId: req.auth!.userId,
      ...(parsedQuery.subscriptionId ? { subscriptionId: parsedQuery.subscriptionId } : {}),
      ...(parsedQuery.planCode ? { planCode: parsedQuery.planCode } : {}),
      ...(parsedQuery.period ? { period: parsedQuery.period } : {}),
      syncWithProvider: parsedQuery.sync ?? false
    });
    res.status(200).json({ success: true, data: result });
  };

  webhook = async (req: Request, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const parsedBody = webhookSchema.parse(req.body);
    const parsedQuery = webhookSchema.partial().parse(req.query);
    const parsed = {
      ...parsedBody,
      topic: parsedBody.topic ?? parsedQuery.topic,
      type: parsedBody.type ?? parsedQuery.type,
      id: parsedBody.id ?? parsedQuery.id,
      data: parsedBody.data ?? parsedQuery.data
    };
    const payload: { topic?: string; type?: string; data?: { id?: string } } = {};
    if (parsed.topic) payload.topic = parsed.topic;
    if (parsed.type) payload.type = parsed.type;
    if (parsed.data?.id) payload.data = { id: parsed.data.id };
    else if (parsed.id) payload.data = { id: parsed.id };
    const result = await this.service.processWebhook(payload, req.header('x-signature') ?? undefined);
    res.status(200).json({ success: true, data: result });
  };

  listAdminTransactions = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.listAdminTransactions();
    res.status(200).json({ success: true, data });
  };

  listAdminSubscriptions = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>): Promise<void> => {
    const data = await this.service.listAdminSubscriptions();
    res.status(200).json({ success: true, data });
  };
}
