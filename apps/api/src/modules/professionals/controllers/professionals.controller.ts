import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { ProfessionalsService } from '../services/professionals.service.js';

const professionalStatusSchema = z.enum(['active', 'inactive', 'archived']);
const specialtyStatusSchema = z.enum(['active', 'inactive', 'archived']);

const pathParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});

const professionalPathParamsSchema = pathParamsSchema.extend({
  professionalId: z.string().trim().min(1)
});

const specialtyPathParamsSchema = pathParamsSchema.extend({
  specialtyId: z.string().trim().min(1)
});

const createProfessionalSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  licenseNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
  specialtyIds: z.array(z.string().trim().min(1)).optional()
});

const updateProfessionalSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(1).max(40).optional(),
    licenseNumber: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(2000).optional(),
    status: professionalStatusSchema.optional(),
    specialtyIds: z.array(z.string().trim().min(1)).optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

const updateProfessionalStatusSchema = z.object({
  status: professionalStatusSchema
});

const replaceProfessionalSpecialtiesSchema = z.object({
  specialtyIds: z.array(z.string().trim().min(1))
});

const createSpecialtySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional()
});

const updateSpecialtySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    status: specialtyStatusSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

const updateSpecialtyStatusSchema = z.object({
  status: specialtyStatusSchema
});

const service = new ProfessionalsService();

export const professionalsController = {
  listProfessionals: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = pathParamsSchema.parse(req.params);
    const data = await service.listProfessionals(organizationId);
    res.status(200).json({ success: true, data });
  },

  createProfessional: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = pathParamsSchema.parse(req.params);
    const input = createProfessionalSchema.parse(req.body);
    const data = await service.createProfessional(organizationId, input, req.auth ? { globalRole: req.auth.globalRole } : undefined);
    res.status(201).json({ success: true, data });
  },

  getProfessional: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = professionalPathParamsSchema.parse(req.params);
    const data = await service.getProfessional(organizationId, professionalId);
    res.status(200).json({ success: true, data });
  },

  updateProfessional: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = professionalPathParamsSchema.parse(req.params);
    const input = updateProfessionalSchema.parse(req.body);
    const data = await service.updateProfessional(organizationId, professionalId, input, req.auth ? { globalRole: req.auth.globalRole } : undefined);
    res.status(200).json({ success: true, data });
  },

  updateProfessionalStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = professionalPathParamsSchema.parse(req.params);
    const { status } = updateProfessionalStatusSchema.parse(req.body);
    const data = await service.updateProfessionalStatus(organizationId, professionalId, status, req.auth ? { globalRole: req.auth.globalRole } : undefined);
    res.status(200).json({ success: true, data });
  },

  replaceProfessionalSpecialties: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = professionalPathParamsSchema.parse(req.params);
    const { specialtyIds } = replaceProfessionalSpecialtiesSchema.parse(req.body);
    const data = await service.replaceProfessionalSpecialties(organizationId, professionalId, specialtyIds);
    res.status(200).json({ success: true, data });
  },

  listSpecialties: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = pathParamsSchema.parse(req.params);
    const data = await service.listSpecialties(organizationId);
    res.status(200).json({ success: true, data });
  },

  createSpecialty: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = pathParamsSchema.parse(req.params);
    const input = createSpecialtySchema.parse(req.body);
    const data = await service.createSpecialty(organizationId, input);
    res.status(201).json({ success: true, data });
  },

  getSpecialty: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, specialtyId } = specialtyPathParamsSchema.parse(req.params);
    const data = await service.getSpecialty(organizationId, specialtyId);
    res.status(200).json({ success: true, data });
  },

  updateSpecialty: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, specialtyId } = specialtyPathParamsSchema.parse(req.params);
    const input = updateSpecialtySchema.parse(req.body);
    const data = await service.updateSpecialty(organizationId, specialtyId, input);
    res.status(200).json({ success: true, data });
  },

  updateSpecialtyStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, specialtyId } = specialtyPathParamsSchema.parse(req.params);
    const { status } = updateSpecialtyStatusSchema.parse(req.body);
    const data = await service.updateSpecialtyStatus(organizationId, specialtyId, status);
    res.status(200).json({ success: true, data });
  }
};
