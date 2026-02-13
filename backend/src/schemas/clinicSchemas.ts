import { z } from "zod";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const intervalSchema = z
  .object({
    start: z.string().regex(hhmmRegex),
    end: z.string().regex(hhmmRegex),
  })
  .refine((v) => v.start < v.end, { message: "Intervalo inválido" });

export const updateSettingsSchema = z.object({
  slotDurationMinutes: z.number().int().min(5).max(180),
  weeklySchedule: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        enabled: z.boolean(),
        intervals: z.array(intervalSchema),
      })
    )
    .length(7),
});
