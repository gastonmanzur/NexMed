import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/errors.js';
import { PushService } from './push.service.js';

const createService = () => {
  const devices = {
    upsert: vi.fn(),
    refreshToken: vi.fn(),
    deleteByToken: vi.fn(),
    listByUser: vi.fn(),
    getActiveTokensByUser: vi.fn(),
    invalidateToken: vi.fn()
  };

  const users = { findById: vi.fn() };
  const provider = { send: vi.fn() };

  const service = new PushService(devices as never, users as never, provider as never);
  return { service, devices, users, provider };
};

describe('PushService', () => {
  it('registers token idempotently through repository upsert', async () => {
    const { service, devices, users } = createService();
    users.findById.mockResolvedValue({ _id: 'u1' });
    devices.upsert.mockResolvedValue({ token: 'token-12345678901234567890' });

    await service.registerDevice({
      userId: 'u1',
      token: 'token-12345678901234567890',
      platform: 'web',
      channel: 'web_push'
    });

    expect(devices.upsert).toHaveBeenCalledTimes(1);
  });

  it('marks invalid tokens reported by provider', async () => {
    const { service, devices, users, provider } = createService();
    users.findById.mockResolvedValue({ _id: 'u1' });
    devices.getActiveTokensByUser.mockResolvedValue(['t1', 't2']);
    provider.send.mockResolvedValue([
      { token: 't1', success: true, shouldInvalidateToken: false },
      { token: 't2', success: false, shouldInvalidateToken: true }
    ]);

    const report = await service.sendToUser({
      actorUserId: 'admin',
      actorRole: 'admin',
      targetUserId: 'u1',
      title: 'hello',
      body: 'body'
    });

    expect(report.invalidatedTokens).toBe(1);
    expect(devices.invalidateToken).toHaveBeenCalledWith('t2');
  });

  it('maps provider errors to app error', async () => {
    const { service, devices, users, provider } = createService();
    users.findById.mockResolvedValue({ _id: 'u1' });
    devices.getActiveTokensByUser.mockResolvedValue(['t1']);
    provider.send.mockRejectedValue(new Error('provider down'));

    await expect(
      service.sendToUser({
        actorUserId: 'admin',
        actorRole: 'admin',
        targetUserId: 'u1',
        title: 'hello',
        body: 'body'
      })
    ).rejects.toMatchObject({ code: 'PUSH_PROVIDER_ERROR' } satisfies Partial<AppError>);
  });
});
