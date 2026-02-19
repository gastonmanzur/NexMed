import { z } from "zod";

const phoneRegex = /^[\d\s+\-()]{6,30}$/;

const optionalTrimmed = z.string().trim().max(250).optional();
const optionalPhone = z.string().trim().regex(phoneRegex, "Teléfono inválido").optional().or(z.literal(""));

const publicVisibilitySchema = z
  .object({
    phone: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    website: z.boolean().optional(),
    address: z.boolean().optional(),
    city: z.boolean().optional(),
    province: z.boolean().optional(),
    postalCode: z.boolean().optional(),
    description: z.boolean().optional(),
    businessHoursNote: z.boolean().optional(),
  })
  .optional();

export const updateClinicProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  website: z.string().trim().url("Website inválido").optional().or(z.literal("")),
  address: optionalTrimmed,
  city: optionalTrimmed,
  province: optionalTrimmed,
  postalCode: optionalTrimmed,
  description: z.string().trim().max(1200).optional(),
  businessHoursNote: z.string().trim().max(600).optional(),
  legalName: z.string().trim().max(160).optional(),
  taxId: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.replace(/\D/g, "").length === 11, "CUIT inválido"),
  billingEmail: z.string().trim().email("Email de facturación inválido").optional().or(z.literal("")),
  fiscalAddress: z.string().trim().max(250).optional(),
  fiscalCity: z.string().trim().max(120).optional(),
  fiscalProvince: z.string().trim().max(120).optional(),
  fiscalPostalCode: z.string().trim().max(50).optional(),
  invoiceNotes: z.string().trim().max(1200).optional(),
  publicVisibility: publicVisibilitySchema,
});

export const updatePatientProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(120).optional(),
  lastName: z.string().trim().min(2).max(120).optional(),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  age: z.number().int().min(0).max(120).optional(),
});

export const createClinicInviteSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional(),
});

export const updateClinicInviteSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => value.label !== undefined || value.active !== undefined, "Enviá al menos un campo para actualizar");

export const idParamSchema = z.object({
  id: z.string().trim().min(1),
});
