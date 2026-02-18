import { z } from "zod";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalTrimmed = z.string().trim().optional().or(z.literal(""));

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const professionalIdParamSchema = z.object({
  id: z.string().min(1),
  timeoffId: z.string().min(1).optional(),
});

export const createSpecialtySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).optional(),
});

export const updateSpecialtySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional(),
});

export const createProfessionalSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: optionalTrimmed,
  phone: optionalTrimmed,
  specialtyIds: z.array(z.string().min(1)).min(1),
  isActive: z.boolean().optional(),
});

export const updateProfessionalSchema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  email: optionalTrimmed,
  phone: optionalTrimmed,
  specialtyIds: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
});

const weeklyBlockSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(hhmmRegex),
    endTime: z.string().regex(hhmmRegex),
  })
  .refine((v) => v.endTime > v.startTime, { message: "Intervalo inválido" });

export const putAvailabilitySchema = z.object({
  weeklyBlocks: z.array(weeklyBlockSchema),
  slotMinutes: z.number().int().min(5).max(180).optional(),
});

export const createTimeOffSchema = z
  .object({
    date: z.string().regex(dateRegex),
    startTime: z.string().regex(hhmmRegex).optional(),
    endTime: z.string().regex(hhmmRegex).optional(),
    reason: z.string().trim().max(240).optional(),
  })
  .refine((v) => (!!v.startTime && !!v.endTime) || (!v.startTime && !v.endTime), {
    message: "Debe enviar ambos horarios o ninguno",
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, { message: "Intervalo inválido" });

export const publicPeopleQuerySchema = z.object({
  includeSpecialties: z.union([z.literal("true"), z.literal("false")]).optional(),
});
