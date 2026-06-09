import multer from 'multer';
import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { ProfessionalsService } from '../services/professionals.service.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../core/errors.js';
import sharp from 'sharp';
import path from 'node:path';
import { LocalStorageProvider } from '../../avatar/file-storage/local-storage.provider.js';
import { logger } from '../../../config/logger.js';

const professionalStatusSchema = z.enum(['active', 'inactive', 'archived']);
const availabilityReleaseModeSchema = z.enum(['free', 'progressive']);
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
  availabilityReleaseMode: availabilityReleaseModeSchema.optional(),
  availabilityReleaseLimit: z.number().int().min(1).max(20).nullable().optional(),
  specialtyIds: z.array(z.string().trim().min(1)).optional()
}).superRefine((value, context) => {
  if (value.availabilityReleaseMode === 'progressive' && value.availabilityReleaseLimit == null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['availabilityReleaseLimit'], message: 'availabilityReleaseLimit is required for progressive release' });
  }
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
    availabilityReleaseMode: availabilityReleaseModeSchema.optional(),
    availabilityReleaseLimit: z.number().int().min(1).max(20).nullable().optional(),
    specialtyIds: z.array(z.string().trim().min(1)).optional()
  })
  .superRefine((value, context) => {
    if (value.availabilityReleaseMode === 'progressive' && value.availabilityReleaseLimit == null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['availabilityReleaseLimit'], message: 'availabilityReleaseLimit is required for progressive release' });
    }
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


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.AVATAR_MAX_SIZE_BYTES } });
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const PROFESSIONAL_AVATAR_SIZE = 256;
const avatarRootDir = path.resolve(process.cwd(), env.AVATAR_STORAGE_DIR);
const storageProvider = new LocalStorageProvider(avatarRootDir, env.AVATAR_PUBLIC_BASE_PATH);

const extractStorageKey = (avatarUrl?: string | null): string | null => {
  if (!avatarUrl) return null;
  const marker = `${env.AVATAR_PUBLIC_BASE_PATH}/`;
  const index = avatarUrl.indexOf(marker);
  if (index === -1) return null;
  return avatarUrl.slice(index + marker.length) || null;
};

export const professionalAvatarUploadMiddleware = upload.single('avatar');
export const professionalAvatarMulterErrorHandler = (error: unknown): never => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    throw new AppError('FILE_TOO_LARGE', 413, 'Avatar exceeds max file size');
  }
  throw error instanceof Error ? error : new AppError('UPLOAD_ERROR', 400, 'Unable to upload avatar');
};

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


  uploadProfessionalAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = professionalPathParamsSchema.parse(req.params);
    if (!req.file) throw new AppError('FILE_REQUIRED', 400, 'Avatar file is required');
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) throw new AppError('UNSUPPORTED_IMAGE_TYPE', 400, 'Unsupported image type');
    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await sharp(req.file.buffer).rotate().resize(PROFESSIONAL_AVATAR_SIZE, PROFESSIONAL_AVATAR_SIZE, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toBuffer();
    } catch {
      throw new AppError('IMAGE_PROCESSING_ERROR', 400, 'Unable to process avatar image');
    }
    const current = await service.getProfessional(organizationId, professionalId);
    const previousKey = extractStorageKey(current.avatarUrl);
    const stored = await storageProvider.put({ buffer: normalizedBuffer, extension: 'webp', mimeType: 'image/webp' });
    const data = await service.updateProfessionalAvatar(organizationId, professionalId, stored.url);
    if (previousKey && previousKey !== stored.key) {
      try { await storageProvider.remove(previousKey); } catch (error) { logger.warn({ error, previousKey, professionalId }, 'Failed to clean up previous professional avatar file'); }
    }
    res.status(200).json({ success: true, data });
  },

  deleteProfessionalAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = professionalPathParamsSchema.parse(req.params);
    const current = await service.getProfessional(organizationId, professionalId);
    const previousKey = extractStorageKey(current.avatarUrl);
    const data = await service.updateProfessionalAvatar(organizationId, professionalId, null);
    if (previousKey) {
      try { await storageProvider.remove(previousKey); } catch (error) { logger.warn({ error, previousKey, professionalId }, 'Failed to clean up removed professional avatar file'); }
    }
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

