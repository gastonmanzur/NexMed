import { z } from "zod";

export const availabilityQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createPublicAppointmentSchema = z.object({
  startAt: z.iso.datetime(),
  patientFullName: z.string().min(2),
  patientPhone: z.string().min(6),
  note: z.string().max(500).optional(),
});

export const listAppointmentsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  q: z.string().optional(),
});


export const rescheduleMyAppointmentSchema = z.object({
  startAt: z.iso.datetime(),
});
