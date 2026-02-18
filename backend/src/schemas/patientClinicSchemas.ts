import { z } from "zod";

export const joinClinicSchema = z.object({
  token: z.string().min(12),
});
