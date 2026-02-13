import { z } from "zod";

const baseSchema = z.object({
  type: z.enum(["clinic", "patient"]),
  email: z.email(),
  password: z.string().min(6),
});

const clinicSchema = baseSchema.extend({
  type: z.literal("clinic"),
  name: z.string().min(2),
  phone: z.string().min(3),
  address: z.string().min(3),
  city: z.string().min(2),
});

const patientSchema = baseSchema.extend({
  type: z.literal("patient"),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  age: z.number().int().min(0).max(120),
  phone: z.string().min(3),
});

export const registerSchema = z.discriminatedUnion("type", [clinicSchema, patientSchema]);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const googleLoginSchema = z.object({
  credential: z.string().min(10),
});
