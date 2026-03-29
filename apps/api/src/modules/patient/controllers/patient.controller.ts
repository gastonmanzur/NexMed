import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { PatientService } from '../services/patient.service.js';

const service = new PatientService();

const joinParamsSchema = z.object({ tokenOrSlug: z.string().trim().min(1) });
const joinSchema = z.object({ tokenOrSlug: z.string().trim().min(1) });
const organizationParamsSchema = z.object({ organizationId: z.string().trim().min(1) });
const availabilityQuerySchema = z.object({
  professionalId: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1)
});

const updateMeSchema = z.object({
  phone: z.string().trim().min(1).max(40).optional(),
  dateOfBirth: z.string().trim().optional(),
  documentId: z.string().trim().max(60).optional()
});

const createAppointmentSchema = z.object({
  professionalId: z.string().trim().min(1),
  specialtyId: z.string().trim().min(1).optional(),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).optional()
});

const appointmentParamsSchema = z.object({ appointmentId: z.string().trim().min(1) });

const listAppointmentsQuerySchema = z.object({
  status: z.enum(['booked', 'canceled_by_staff', 'canceled_by_patient', 'rescheduled', 'completed', 'no_show']).optional(),
  organizationId: z.string().trim().min(1).optional()
});

const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });

const rescheduleSchema = z.object({
  newProfessionalId: z.string().trim().min(1).optional(),
  newSpecialtyId: z.string().trim().min(1).optional(),
  newStartAt: z.string().trim().min(1),
  newEndAt: z.string().trim().min(1).optional(),
  reason: z.string().trim().max(300).optional()
});

export const patientController = {
  joinPreview: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const data = await service.getJoinPreview(tokenOrSlug);
    res.status(200).json({ success: true, data });
  },

  joinResolve: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinSchema.parse(req.body);
    const data = await service.resolveJoin(req.auth!.userId, tokenOrSlug);
    res.status(200).json({ success: true, data });
  },

  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.getPatientMe(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  patchMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = updateMeSchema.parse(req.body);
    const data = await service.updateMyProfile(req.auth!.userId, {
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
      ...(input.documentId !== undefined ? { documentId: input.documentId } : {})
    });
    res.status(200).json({ success: true, data });
  },

  organizations: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listPatientOrganizations(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  availability: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationParamsSchema.parse(req.params);
    const input = availabilityQuerySchema.parse(req.query);
    const data = await service.getAvailabilityForPatient(req.auth!.userId, organizationId, input);
    res.status(200).json({ success: true, data });
  },

  organizationCatalog: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationParamsSchema.parse(req.params);
    const data = await service.getOrganizationCatalog(req.auth!.userId, organizationId);
    res.status(200).json({ success: true, data });
  },

  createAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationParamsSchema.parse(req.params);
    const input = createAppointmentSchema.parse(req.body);
    const data = await service.createSelfServiceAppointment(req.auth!.userId, organizationId, {
      professionalId: input.professionalId,
      startAt: input.startAt,
      ...(input.specialtyId !== undefined ? { specialtyId: input.specialtyId } : {}),
      ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {})
    });
    res.status(201).json({ success: true, data });
  },

  listAppointments: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = listAppointmentsQuerySchema.parse(req.query);
    const data = await service.listPatientAppointments(req.auth!.userId, {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.organizationId !== undefined ? { organizationId: query.organizationId } : {})
    });
    res.status(200).json({ success: true, data });
  },

  getAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const data = await service.getPatientAppointment(req.auth!.userId, appointmentId);
    res.status(200).json({ success: true, data });
  },

  cancelAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const { reason } = cancelSchema.parse(req.body);
    const data = await service.cancelPatientAppointment(req.auth!.userId, appointmentId, reason);
    res.status(200).json({ success: true, data });
  },

  rescheduleAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const input = rescheduleSchema.parse(req.body);
    const data = await service.reschedulePatientAppointment(req.auth!.userId, appointmentId, {
      newStartAt: input.newStartAt,
      ...(input.newProfessionalId !== undefined ? { newProfessionalId: input.newProfessionalId } : {}),
      ...(input.newSpecialtyId !== undefined ? { newSpecialtyId: input.newSpecialtyId } : {}),
      ...(input.newEndAt !== undefined ? { newEndAt: input.newEndAt } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {})
    });
    res.status(200).json({ success: true, data });
  },

  listEvents: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listUserEvents(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  markEventsRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await service.markUserEventsRead(req.auth!.userId);
    res.status(200).json({ success: true, data: { ok: true } });
  }
};
