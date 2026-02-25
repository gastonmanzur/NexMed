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
});

export const rescheduleMyAppointmentSchema = z.object({
  startAt: z.iso.datetime(),
  professionalId: z.string().min(1).optional(),
  specialtyId: z.string().min(1).optional(),
});
