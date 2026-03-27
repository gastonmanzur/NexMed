import path from 'node:path';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../core/async-handler.js';
import { requireAuth, requireRoles } from '../auth/middleware/auth.middleware.js';
import { createAvatarController, avatarUploadMiddleware, avatarMulterErrorHandler } from './controllers/avatar.controller.js';
import { AvatarService } from './services/avatar.service.js';
import { LocalStorageProvider } from './file-storage/local-storage.provider.js';

const avatarRootDir = path.resolve(process.cwd(), env.AVATAR_STORAGE_DIR);
const localStorageProvider = new LocalStorageProvider(avatarRootDir, env.AVATAR_PUBLIC_BASE_PATH);
const avatarService = new AvatarService(undefined, localStorageProvider);
const avatarController = createAvatarController(avatarService);

export const avatarRouter = Router();

const uploadAvatar = (req: Parameters<typeof avatarUploadMiddleware>[0], res: Parameters<typeof avatarUploadMiddleware>[1], next: Parameters<typeof avatarUploadMiddleware>[2]): void => {
  avatarUploadMiddleware(req, res, (error: unknown) => {
    if (error) {
      try {
        avatarMulterErrorHandler(error);
      } catch (mappedError) {
        next(mappedError);
        return;
      }
    }
    next();
  });
};

avatarRouter.get('/me', requireAuth, asyncHandler(avatarController.getMyAvatar));
avatarRouter.post('/me', requireAuth, uploadAvatar, asyncHandler(avatarController.myAvatar));
avatarRouter.delete('/me', requireAuth, asyncHandler(avatarController.deleteMyAvatar));

avatarRouter.post('/users/:userId', requireAuth, requireRoles('admin'), uploadAvatar, asyncHandler(avatarController.adminUploadAvatar));
avatarRouter.delete('/users/:userId', requireAuth, requireRoles('admin'), asyncHandler(avatarController.adminDeleteAvatar));
