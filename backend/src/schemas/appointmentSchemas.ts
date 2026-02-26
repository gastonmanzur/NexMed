import { z } from "zod";

export const availabilityQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  professionalId: z.string().min(1).optional(),
  specialtyId: z.string().min(1).optional(),
  ts: z.string().optional(),
});

export const createPublicAppointmentSchema = z
  .object({
    startAt: z.iso.datetime(),
    note: z.string().max(500).optional(),
    professionalId: z.string().min(1).optional(),
    specialtyId: z.string().min(1).optional(),
  })
  .refine((payload) => Boolean(payload.professionalId) || Boolean(payload.specialtyId), {
    message: "Debés enviar professionalId o specialtyId",
  });

export const listAppointmentsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  q: z.string().optional(),
  professionalId: z.string().min(1).optional(),
  status: z.enum(["booked", "canceled", "completed", "no_show"]).optional(),
  confirmation: z.enum(["pending", "confirmed", "rejected"]).optional(),
});

export const appointmentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const rescheduleMyAppointmentSchema = z.object({
  startAt: z.iso.datetime(),
  professionalId: z.string().min(1).optional(),
  specialtyId: z.string().min(1).optional(),
});

export const patientAppointmentHistoryQuerySchema = z.object({
  status: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  clinicId: z.string().min(1).optional(),
  professionalId: z.string().min(1).optional(),
  specialtyId: z.string().min(1).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sort: z.string().optional(),
});
