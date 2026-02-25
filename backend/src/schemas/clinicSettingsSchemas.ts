import { z } from "zod";

export const reminderOffsetSchema = z.object({
  amount: z.number().int().positive(),
  unit: z.enum(["days", "hours"]),
});

export const updateReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  channels: z.object({
    email: z.boolean(),
  }),
  offsets: z.array(reminderOffsetSchema).max(5),
});
