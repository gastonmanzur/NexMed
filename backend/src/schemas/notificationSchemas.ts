import { z } from "zod";

const ruleSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
  offsetValue: z.number().int().positive(),
  offsetUnit: z.enum(["days", "hours"]),
  channel: z.enum(["inApp", "email"]),
});

export const updateNotificationSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  timezone: z.string().trim().min(1).max(80).optional(),
  rules: z
    .array(ruleSchema)
    .min(1)
    .superRefine((rules, ctx) => {
      rules.forEach((rule, index) => {
        if (rule.offsetUnit === "days" && rule.offsetValue > 365) {
          ctx.addIssue({ code: "custom", message: "offset days máximo 365", path: [index, "offsetValue"] });
        }
        if (rule.offsetUnit === "hours" && rule.offsetValue > 168) {
          ctx.addIssue({ code: "custom", message: "offset hours máximo 168", path: [index, "offsetValue"] });
        }
      });
    }),
});

export const notificationPreviewQuerySchema = z.object({
  appointmentId: z.string().trim().min(1),
});


export const triggerAppointmentRemindersNowParamsSchema = z.object({
  appointmentId: z.string().trim().min(1),
});
