import multer from 'multer';
import type { Response } from 'express';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import type { AvatarService } from '../services/avatar.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.AVATAR_MAX_SIZE_BYTES } });

const parseTargetUserId = (req: AuthenticatedRequest): string => {
  const rawTargetUserId = req.params.userId;
  const targetUserId = Array.isArray(rawTargetUserId) ? rawTargetUserId[0] : rawTargetUserId;
  if (!targetUserId) {
    return req.auth!.userId;
  }
  return targetUserId;
};

export const avatarUploadMiddleware = upload.single('avatar');

export const createAvatarController = (avatarService: AvatarService) => ({
  myAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await avatarService.uploadAvatar({
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      targetUserId: req.auth!.userId,
      file: req.file
    });

    res.status(200).json({ success: true, data: { avatar: result.user?.avatar ?? null } });
  },

  deleteMyAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await avatarService.deleteAvatar(req.auth!.userId, req.auth!.userId, req.auth!.role);
    res.status(200).json({ success: true, data: { message: 'Avatar deleted' } });
  },

  getMyAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await avatarService.getAvatar(req.auth!.userId);
    res.status(200).json({ success: true, data: result });
  },

  adminUploadAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const targetUserId = parseTargetUserId(req);
    const result = await avatarService.uploadAvatar({
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      targetUserId,
      file: req.file
    });
    res.status(200).json({ success: true, data: { avatar: result.user?.avatar ?? null } });
  },

  adminDeleteAvatar: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const targetUserId = parseTargetUserId(req);
    await avatarService.deleteAvatar(req.auth!.userId, targetUserId, req.auth!.role);
    res.status(200).json({ success: true, data: { message: 'Avatar deleted' } });
  }
});

export const avatarMulterErrorHandler = (error: unknown): never => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    throw new AppError('FILE_TOO_LARGE', 413, 'Avatar exceeds max file size');
  }

  throw error instanceof Error ? error : new AppError('UPLOAD_ERROR', 400, 'Unable to upload avatar');
};
