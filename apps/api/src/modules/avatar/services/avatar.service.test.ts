import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import { AvatarService } from './avatar.service.js';

const createMockUserRepo = () => ({
  findById: vi.fn(),
  setAvatar: vi.fn(),
  clearAvatar: vi.fn()
});

const createMockStorage = () => ({
  put: vi.fn(),
  remove: vi.fn()
});

const pngBuffer = Buffer.from(
  '89504E470D0A1A0A0000000D4948445200000001000000010802000000907753DE0000000C49444154789C63606060000000040001F61738550000000049454E44AE426082',
  'hex'
);

describe('AvatarService', () => {
  it('uploads valid avatar and updates user', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValueOnce({ _id: { toString: () => 'u1' }, avatar: null }).mockResolvedValueOnce({ avatar: { key: 'new-key' } });
    storage.put.mockResolvedValue({ key: 'new-key', url: 'http://localhost/new.webp', mimeType: 'image/webp', sizeBytes: 1000 });

    const service = new AvatarService(users as never, storage as never);

    await service.uploadAvatar({
      actorUserId: 'u1',
      actorRole: 'user',
      targetUserId: 'u1',
      file: { buffer: pngBuffer, mimetype: 'image/png', size: pngBuffer.length } as Express.Multer.File
    });

    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(users.setAvatar).toHaveBeenCalledTimes(1);
  });

  it('rejects missing file', async () => {
    const service = new AvatarService(createMockUserRepo() as never, createMockStorage() as never);

    await expect(
      service.uploadAvatar({
        actorUserId: 'u1',
        actorRole: 'user',
        targetUserId: 'u1',
        file: undefined
      })
    ).rejects.toMatchObject({ code: 'FILE_REQUIRED' } satisfies Partial<AppError>);
  });

  it('rejects invalid file type', async () => {
    const service = new AvatarService(createMockUserRepo() as never, createMockStorage() as never);

    await expect(
      service.uploadAvatar({
        actorUserId: 'u1',
        actorRole: 'user',
        targetUserId: 'u1',
        file: { buffer: Buffer.from('plain-text'), mimetype: 'text/plain', size: 10 } as Express.Multer.File
      })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_IMAGE_TYPE' } satisfies Partial<AppError>);
  });

  it('rejects file over max size', async () => {
    const service = new AvatarService(createMockUserRepo() as never, createMockStorage() as never);

    await expect(
      service.uploadAvatar({
        actorUserId: 'u1',
        actorRole: 'user',
        targetUserId: 'u1',
        file: { buffer: pngBuffer, mimetype: 'image/png', size: env.AVATAR_MAX_SIZE_BYTES + 1 } as Express.Multer.File
      })
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' } satisfies Partial<AppError>);
  });


  it('rejects avatar upload for google users', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValue({ _id: { toString: () => 'u1' }, provider: 'google', avatar: null });

    const service = new AvatarService(users as never, storage as never);

    await expect(
      service.uploadAvatar({
        actorUserId: 'u1',
        actorRole: 'user',
        targetUserId: 'u1',
        file: { buffer: pngBuffer, mimetype: 'image/png', size: pngBuffer.length } as Express.Multer.File
      })
    ).rejects.toMatchObject({ code: 'GOOGLE_AVATAR_MANAGED_EXTERNALLY' } satisfies Partial<AppError>);
  });

  it('deletes previous avatar on replacement', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValueOnce({ _id: { toString: () => 'u1' }, avatar: { key: 'old-key' } }).mockResolvedValueOnce({ avatar: { key: 'new-key' } });
    storage.put.mockResolvedValue({ key: 'new-key', url: 'http://localhost/new.webp', mimeType: 'image/webp', sizeBytes: 1000 });

    const service = new AvatarService(users as never, storage as never);

    await service.uploadAvatar({
      actorUserId: 'u1',
      actorRole: 'user',
      targetUserId: 'u1',
      file: { buffer: pngBuffer, mimetype: 'image/png', size: pngBuffer.length } as Express.Multer.File
    });

    expect(storage.remove).toHaveBeenCalledWith('old-key');
  });

  it('keeps upload successful even when previous avatar cleanup fails', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValueOnce({ _id: { toString: () => 'u1' }, avatar: { key: 'old-key' } }).mockResolvedValueOnce({ avatar: { key: 'new-key' } });
    storage.put.mockResolvedValue({ key: 'new-key', url: 'http://localhost/new.webp', mimeType: 'image/webp', sizeBytes: 1000 });
    storage.remove.mockRejectedValue(new Error('cleanup failed'));

    const service = new AvatarService(users as never, storage as never);

    await expect(
      service.uploadAvatar({
        actorUserId: 'u1',
        actorRole: 'user',
        targetUserId: 'u1',
        file: { buffer: pngBuffer, mimetype: 'image/png', size: pngBuffer.length } as Express.Multer.File
      })
    ).resolves.toMatchObject({ user: { avatar: { key: 'new-key' } } });
  });

  it('removes avatar and clears user reference', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValue({ _id: { toString: () => 'u1' }, avatar: { key: 'old-key' } });

    const service = new AvatarService(users as never, storage as never);

    await service.deleteAvatar('u1', 'u1', 'user');

    expect(users.clearAvatar).toHaveBeenCalledWith('u1');
    expect(storage.remove).toHaveBeenCalledWith('old-key');
  });


  it('rejects avatar deletion for google users', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValue({ _id: { toString: () => 'u1' }, provider: 'google', avatar: null });

    const service = new AvatarService(users as never, storage as never);

    await expect(service.deleteAvatar('u1', 'u1', 'user')).rejects.toMatchObject({
      code: 'GOOGLE_AVATAR_MANAGED_EXTERNALLY'
    } satisfies Partial<AppError>);
  });

  it('does not fail deleting when avatar does not exist', async () => {
    const users = createMockUserRepo();
    const storage = createMockStorage();
    users.findById.mockResolvedValue({ _id: { toString: () => 'u1' }, avatar: null });

    const service = new AvatarService(users as never, storage as never);

    await expect(service.deleteAvatar('u1', 'u1', 'user')).resolves.toBeUndefined();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('blocks non-admin from modifying another user avatar', async () => {
    const service = new AvatarService(createMockUserRepo() as never, createMockStorage() as never);

    await expect(service.deleteAvatar('u1', 'u2', 'user')).rejects.toMatchObject({ code: 'FORBIDDEN' } satisfies Partial<AppError>);
  });
});
