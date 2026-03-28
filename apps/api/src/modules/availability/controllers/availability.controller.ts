import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { AvailabilityService } from '../services/availability.service.js';

const ruleStatusSchema = z.enum(['active', 'inactive', 'archived']);
const exceptionStatusSchema = z.enum(['active', 'inactive', 'archived']);
const exceptionTypeSchema = z.enum(['full_day_block', 'partial_block']);

const pathParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
  professionalId: z.string().trim().min(1)
});

const rulePathParamsSchema = pathParamsSchema.extend({
  ruleId: z.string().trim().min(1)
});

const exceptionPathParamsSchema = pathParamsSchema.extend({
  exceptionId: z.string().trim().min(1)
});

const weekdaySchema = z.number().int().min(0).max(6);
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

const createRuleSchema = z.object({
  weekday: weekdaySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  appointmentDurationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0).optional()
});

const updateRuleSchema = z
  .object({
    weekday: weekdaySchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    appointmentDurationMinutes: z.number().int().positive().optional(),
    bufferMinutes: z.number().int().min(0).optional(),
    status: ruleStatusSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

const updateRuleStatusSchema = z.object({
  status: ruleStatusSchema
});

const createExceptionSchema = z
  .object({
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: exceptionTypeSchema,
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    reason: z.string().trim().max(500).optional()
  })
  .superRefine((value, context) => {
    if (value.type === 'partial_block' && (!value.startTime || !value.endTime)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'partial_block requires startTime and endTime' });
    }

    if (value.type === 'full_day_block' && (value.startTime || value.endTime)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'full_day_block should not include startTime or endTime' });
    }
  });

const updateExceptionSchema = z
  .object({
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    type: exceptionTypeSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    reason: z.string().trim().max(500).optional(),
    status: exceptionStatusSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

const updateExceptionStatusSchema = z.object({
  status: exceptionStatusSchema
});

const queryRangeSchema = z.object({
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const service = new AvailabilityService();

export const availabilityController = {
  listRules: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = pathParamsSchema.parse(req.params);
    const data = await service.listRules(organizationId, professionalId);
    res.status(200).json({ success: true, data });
  },

  createRule: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = pathParamsSchema.parse(req.params);
    const input = createRuleSchema.parse(req.body);
    const data = await service.createRule(organizationId, professionalId, input);
    res.status(201).json({ success: true, data });
  },

  getRule: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId, ruleId } = rulePathParamsSchema.parse(req.params);
    const data = await service.getRule(organizationId, professionalId, ruleId);
    res.status(200).json({ success: true, data });
  },

  updateRule: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId, ruleId } = rulePathParamsSchema.parse(req.params);
    const input = updateRuleSchema.parse(req.body);
    const data = await service.updateRule(organizationId, professionalId, ruleId, input);
    res.status(200).json({ success: true, data });
  },

  updateRuleStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId, ruleId } = rulePathParamsSchema.parse(req.params);
    const { status } = updateRuleStatusSchema.parse(req.body);
    const data = await service.updateRuleStatus(organizationId, professionalId, ruleId, status);
    res.status(200).json({ success: true, data });
  },

  listExceptions: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = pathParamsSchema.parse(req.params);
    const data = await service.listExceptions(organizationId, professionalId);
    res.status(200).json({ success: true, data });
  },

  createException: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = pathParamsSchema.parse(req.params);
    const input = createExceptionSchema.parse(req.body);
    const data = await service.createException(organizationId, professionalId, input);
    res.status(201).json({ success: true, data });
  },

  updateException: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId, exceptionId } = exceptionPathParamsSchema.parse(req.params);
    const input = updateExceptionSchema.parse(req.body);
    const data = await service.updateException(organizationId, professionalId, exceptionId, input);
    res.status(200).json({ success: true, data });
  },

  updateExceptionStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId, exceptionId } = exceptionPathParamsSchema.parse(req.params);
    const { status } = updateExceptionStatusSchema.parse(req.body);
    const data = await service.updateExceptionStatus(organizationId, professionalId, exceptionId, status);
    res.status(200).json({ success: true, data });
  },

  getCalculatedAvailability: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = pathParamsSchema.parse(req.params);
    const { startDate, endDate } = queryRangeSchema.parse(req.query);
    const data = await service.getCalculatedAvailability(organizationId, professionalId, { startDate, endDate });
    res.status(200).json({ success: true, data });
  }
};
