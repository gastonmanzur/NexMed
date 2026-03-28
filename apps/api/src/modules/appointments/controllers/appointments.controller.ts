import type { Response } from 'express';
import { z } from 'zod';
import type { AppointmentStatus } from '@starter/shared-types';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { AppointmentsService } from '../services/appointments.service.js';

const pathSchema = z.object({
  organizationId: z.string().trim().min(1)
});

const appointmentPathSchema = pathSchema.extend({
  appointmentId: z.string().trim().min(1)
});

const appointmentStatusSchema = z.enum([
  'booked',
  'canceled_by_staff',
  'canceled_by_patient',
  'rescheduled',
  'completed',
  'no_show'
]);

const listQuerySchema = z.object({
  professionalId: z.string().trim().min(1).optional(),
  status: appointmentStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const createSchema = z.object({
  professionalId: z.string().trim().min(1),
  specialtyId: z.string().trim().min(1).optional(),
  patientProfileId: z.string().trim().min(1).optional(),
  patientName: z.string().trim().min(1),
  patientEmail: z.string().email().optional(),
  patientPhone: z.string().trim().min(1).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  notes: z.string().trim().max(1000).optional()
});

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

const rescheduleSchema = z.object({
  newProfessionalId: z.string().trim().min(1).optional(),
  newSpecialtyId: z.string().trim().min(1).optional(),
  newStartAt: z.string().datetime(),
  newEndAt: z.string().datetime().optional(),
  reason: z.string().trim().max(500).optional()
});

const service = new AppointmentsService();

export const appointmentsController = {
  list: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = pathSchema.parse(req.params);
    const query = listQuerySchema.parse(req.query);

    const data = await service.listAppointments(organizationId, {
      ...(query.professionalId ? { professionalId: query.professionalId } : {}),
      ...(query.status ? { status: query.status as AppointmentStatus } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {})
    });

    res.status(200).json({ success: true, data });
  },

  create: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = pathSchema.parse(req.params);
    const input = createSchema.parse(req.body);

    const role = req.auth?.organizationRole;
    const actorRole = role === 'owner' || role === 'admin' || role === 'staff' || role === 'patient' ? role : 'admin';

    const data = await service.createAppointment(organizationId, req.auth!.userId, actorRole, input);
    res.status(201).json({ success: true, data });
  },

  getById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, appointmentId } = appointmentPathSchema.parse(req.params);
    const data = await service.getAppointment(organizationId, appointmentId);
    res.status(200).json({ success: true, data });
  },

  cancel: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, appointmentId } = appointmentPathSchema.parse(req.params);
    const input = cancelSchema.parse(req.body);

    const data = await service.cancelAppointment(organizationId, appointmentId, req.auth!.userId, input);
    res.status(200).json({ success: true, data });
  },

  reschedule: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, appointmentId } = appointmentPathSchema.parse(req.params);
    const input = rescheduleSchema.parse(req.body);

    const role = req.auth?.organizationRole;
    const actorRole = role === 'owner' || role === 'admin' || role === 'staff' || role === 'patient' ? role : 'admin';

    const data = await service.rescheduleAppointment(organizationId, appointmentId, req.auth!.userId, actorRole, input);
    res.status(200).json({ success: true, data });
  }
};
