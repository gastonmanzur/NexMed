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
    startAt: z.iso.datetime().optional(),
    endAt: z.iso.datetime().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    slotMinutes: z.number().int().min(5).max(180).optional(),
    patientFullName: z.string().min(2).optional(),
    patientPhone: z.string().min(6).optional(),
    note: z.string().max(500).optional(),
    professionalId: z.string().min(1).optional(),
    specialtyId: z.string().min(1).optional(),
    ts: z.string().optional(),
  })
  .refine((payload) => Boolean(payload.startAt) || (Boolean(payload.date) && Boolean(payload.time)), {
    message: "Debés enviar startAt o date+time",
  });

export const listAppointmentsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  q: z.string().optional(),
  professionalId: z.string().min(1).optional(),
});

export const rescheduleMyAppointmentSchema = z.object({
  startAt: z.iso.datetime(),
});
