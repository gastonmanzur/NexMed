import type { UserDocument } from '../../auth/models/user.model.js';
import type { UserRole } from '@starter/shared-types';
import sharp from 'sharp';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../config/logger.js';
import { env } from '../../../config/env.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import type { FileStorageProvider } from '../file-storage/storage-provider.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const AVATAR_SIZE = 256;

interface UploadAvatarInput {
  actorUserId: string;
  targetUserId: string;
  actorRole: UserRole;
  file: Express.Multer.File | undefined;
}

export class AvatarService {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly storage: FileStorageProvider
  ) {}

  async uploadAvatar(input: UploadAvatarInput): Promise<{ user: UserDocument | null }> {
    this.assertCanMutate(input.actorUserId, input.targetUserId, input.actorRole);

    if (!input.file) {
      throw new AppError('FILE_REQUIRED', 400, 'Avatar file is required');
    }

    if (input.file.size > env.AVATAR_MAX_SIZE_BYTES) {
      throw new AppError('FILE_TOO_LARGE', 413, 'Avatar exceeds max file size');
    }

    if (!ALLOWED_MIME_TYPES.includes(input.file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new AppError('UNSUPPORTED_IMAGE_TYPE', 400, 'Unsupported image type');
    }

    try {
      await sharp(input.file.buffer).metadata();
    } catch {
      throw new AppError('INVALID_IMAGE_FILE', 400, 'Uploaded file is not a valid image');
    }

    let normalizedBuffer: Buffer;
    try {
      normalizedBuffer = await sharp(input.file.buffer)
        .rotate()
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new AppError('IMAGE_PROCESSING_ERROR', 400, 'Unable to process avatar image');
    }

    const user = await this.users.findById(input.targetUserId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    if (user.provider === 'google') {
      throw new AppError('GOOGLE_AVATAR_MANAGED_EXTERNALLY', 403, 'Google account avatars are managed from Google profile');
    }

    const previousAvatarKey = user.avatar?.key;
    const stored = await this.storage.put({ buffer: normalizedBuffer, extension: 'webp', mimeType: 'image/webp' });

    try {
      await this.users.setAvatar(input.targetUserId, {
        key: stored.key,
        url: stored.url,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        width: AVATAR_SIZE,
        height: AVATAR_SIZE
      });
    } catch {
      await this.storage.remove(stored.key);
      throw new AppError('AVATAR_UPDATE_FAILED', 500, 'Unable to update avatar reference');
    }

    if (previousAvatarKey && previousAvatarKey !== stored.key) {
      try {
        await this.storage.remove(previousAvatarKey);
      } catch (error) {
        logger.warn({ error, previousAvatarKey, targetUserId: input.targetUserId }, 'Failed to clean up previous avatar file');
      }
    }

    const updated = await this.users.findById(input.targetUserId);
    return { user: updated };
  }

  async deleteAvatar(actorUserId: string, targetUserId: string, actorRole: UserRole): Promise<void> {
    this.assertCanMutate(actorUserId, targetUserId, actorRole);

    const user = await this.users.findById(targetUserId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    if (user.provider === 'google') {
      throw new AppError('GOOGLE_AVATAR_MANAGED_EXTERNALLY', 403, 'Google account avatars are managed from Google profile');
    }

    const previousAvatarKey = user.avatar?.key;
    await this.users.clearAvatar(targetUserId);

    if (previousAvatarKey) {
      await this.storage.remove(previousAvatarKey);
    }
  }

  async getAvatar(targetUserId: string): Promise<{ avatar: UserDocument['avatar'] | null }> {
    const user = await this.users.findById(targetUserId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    return { avatar: user.avatar ?? null };
  }

  private assertCanMutate(actorUserId: string, targetUserId: string, actorRole: UserRole): void {
    if (actorUserId !== targetUserId && actorRole !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Insufficient permissions');
    }
  }
}
