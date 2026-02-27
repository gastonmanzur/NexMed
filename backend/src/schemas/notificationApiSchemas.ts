import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  unreadOnly: z
    .union([z.literal("0"), z.literal("1"), z.literal(0), z.literal(1)])
    .optional()
    .transform((value) => (value === "1" || value === 1 ? 1 : 0)),
});

export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
});
