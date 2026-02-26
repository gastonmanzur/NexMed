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

export const bookingSettingsSchema = z
  .object({
    requireClinicConfirmation: z.boolean(),
    autoConfirmAppointments: z.boolean(),
  })
  .transform((value) => ({
    ...value,
    autoConfirmAppointments: value.requireClinicConfirmation ? value.autoConfirmAppointments : true,
  }));
