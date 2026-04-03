import path from 'node:path';
import sharp from 'sharp';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { AppError } from '../../../core/errors.js';
import { LocalStorageProvider } from '../../avatar/file-storage/local-storage.provider.js';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository.js';
import { OrganizationRepository } from '../repositories/organization.repository.js';
import { OrganizationService } from './organization.service.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const LOGO_SIZE = 512;

const avatarRootDir = path.resolve(process.cwd(), env.AVATAR_STORAGE_DIR);
const storageProvider = new LocalStorageProvider(avatarRootDir, env.AVATAR_PUBLIC_BASE_PATH);

const extractStorageKey = (logoUrl?: string | null): string | null => {
  if (!logoUrl) {
    return null;
  }

  const marker = `${env.AVATAR_PUBLIC_BASE_PATH}/`;
  const index = logoUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }

  return logoUrl.slice(index + marker.length) || null;
};

export class OrganizationLogoService {
  constructor(
    private readonly organizations = new OrganizationRepository(),
    private readonly members = new OrganizationMemberRepository(),
    private readonly organizationService = new OrganizationService()
  ) {}

  async uploadLogo(input: { organizationId: string; actorUserId: string; file: Express.Multer.File | undefined }) {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient organization permissions');
    }

    if (!input.file) {
      throw new AppError('FILE_REQUIRED', 400, 'Logo file is required');
    }

    if (input.file.size > env.AVATAR_MAX_SIZE_BYTES) {
      throw new AppError('FILE_TOO_LARGE', 413, 'Logo exceeds max file size');
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
        .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new AppError('IMAGE_PROCESSING_ERROR', 400, 'Unable to process logo image');
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const previousLogoKey = extractStorageKey(organization.logoUrl);
    const stored = await storageProvider.put({
      buffer: normalizedBuffer,
      extension: 'webp',
      mimeType: 'image/webp'
    });

    await this.organizations.updateById(input.organizationId, { logoUrl: stored.url });

    if (previousLogoKey && previousLogoKey !== stored.key) {
      try {
        await storageProvider.remove(previousLogoKey);
      } catch (error) {
        logger.warn({ error, previousLogoKey, organizationId: input.organizationId }, 'Failed to clean up previous organization logo file');
      }
    }

    return this.organizationService.getProfileForUser({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId
    });
  }

  async deleteLogo(input: { organizationId: string; actorUserId: string }) {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient organization permissions');
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const previousLogoKey = extractStorageKey(organization.logoUrl);
    await this.organizations.clearLogoById(input.organizationId);

    if (previousLogoKey) {
      try {
        await storageProvider.remove(previousLogoKey);
      } catch (error) {
        logger.warn({ error, previousLogoKey, organizationId: input.organizationId }, 'Failed to clean up removed organization logo file');
      }
    }

    return this.organizationService.getProfileForUser({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId
    });
  }
}
