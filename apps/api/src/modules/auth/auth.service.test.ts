import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './services/auth.service.js';

const baseUser = {
  _id: { toString: () => 'u1' },
  email: 'john@example.com',
  provider: 'local' as const,
  passwordHash: '$2a$12$4olHQ0YuV78f7u5d5cLjN.urRZA9E6xM8AYrWf8YhNfA0xB7GhGCu',
  role: 'user' as const,
  emailVerified: true
};

describe('AuthService', () => {
  it('rejects provider conflict on local register', async () => {
    const service = new AuthService(
      { findByEmail: async () => ({ ...baseUser, provider: 'google' }), create: async () => baseUser } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(service.registerLocal('john@example.com', 'Password123')).rejects.toMatchObject({
      code: 'PROVIDER_CONFLICT'
    });
  });

  it('rejects invalid credentials on local login', async () => {
    const service = new AuthService(
      { findByEmail: async () => ({ ...baseUser, passwordHash: '$2a$12$invalid.invalid.invalid.invalid.invalid' }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(service.loginLocal('john@example.com', 'Password123')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS'
    });
  });

  it('returns generic response on forgot password for unknown user', async () => {
    const service = new AuthService(
      { findByEmail: async () => null } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(service.forgotPassword('unknown@example.com')).resolves.toBeUndefined();
  });

  it('rejects google login when local account already exists', async () => {
    const service = new AuthService(
      { findByEmail: vi.fn().mockResolvedValue(baseUser) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { verifyIdToken: vi.fn().mockResolvedValue({ email: 'john@example.com', googleId: 'gid-1', emailVerified: true, picture: null }) } as never
    );

    await expect(service.loginWithGoogle('id-token')).rejects.toMatchObject({ code: 'PROVIDER_CONFLICT' });
  });



  it('uses frontend photoURL as fallback when verified token has no picture for new google users', async () => {
    const createdGoogleUser = {
      ...baseUser,
      provider: 'google' as const,
      passwordHash: undefined,
      googleId: 'gid-1',
      googlePictureUrl: 'https://google.test/avatar-fallback.jpg',
      updatedAt: new Date()
    };

    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(createdGoogleUser),
      updateLastLogin: vi.fn()
    };

    const sessions = {
      create: vi.fn()
    };

    const service = new AuthService(
      users as never,
      sessions as never,
      {} as never,
      undefined,
      {} as never,
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          googleId: 'gid-1',
          emailVerified: true,
          picture: null
        })
      } as never
    );

    await service.loginWithGoogle('id-token', 'https://google.test/avatar-fallback.jpg');

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        googleId: 'gid-1',
        googlePictureUrl: 'https://google.test/avatar-fallback.jpg'
      })
    );
  });

  it('persists googlePictureUrl for a new google user and returns it in session avatar', async () => {
    const createdGoogleUser = {
      ...baseUser,
      provider: 'google' as const,
      passwordHash: undefined,
      googleId: 'gid-1',
      googlePictureUrl: 'https://google.test/avatar-new.jpg',
      updatedAt: new Date()
    };

    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(createdGoogleUser),
      updateLastLogin: vi.fn()
    };

    const sessions = {
      create: vi.fn()
    };

    const service = new AuthService(
      users as never,
      sessions as never,
      {} as never,
      undefined,
      {} as never,
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          googleId: 'gid-1',
          emailVerified: true,
          picture: 'https://google.test/avatar-new.jpg'
        })
      } as never
    );

    const result = await service.loginWithGoogle('id-token');

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        googleId: 'gid-1',
        googlePictureUrl: 'https://google.test/avatar-new.jpg'
      })
    );
    expect(result.user.avatar?.url).toBe('https://google.test/avatar-new.jpg');
  });

  it('updates google profile for existing google users and returns updated avatar in session/profile', async () => {
    const existingGoogleUser = {
      ...baseUser,
      provider: 'google' as const,
      passwordHash: undefined,
      googleId: 'gid-old',
      googlePictureUrl: 'https://google.test/avatar-old.jpg',
      updatedAt: new Date('2025-01-01')
    };

    const updatedGoogleUser = {
      ...existingGoogleUser,
      googleId: 'gid-new',
      googlePictureUrl: 'https://google.test/avatar-new.jpg',
      updatedAt: new Date('2025-02-01')
    };

    const users = {
      findByEmail: vi.fn().mockResolvedValue(existingGoogleUser),
      updateGoogleProfile: vi.fn().mockResolvedValue(updatedGoogleUser),
      findById: vi.fn().mockResolvedValue(updatedGoogleUser),
      updateLastLogin: vi.fn()
    };

    const sessions = {
      create: vi.fn()
    };

    const service = new AuthService(
      users as never,
      sessions as never,
      {} as never,
      undefined,
      {} as never,
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          googleId: 'gid-new',
          emailVerified: true,
          picture: 'https://google.test/avatar-new.jpg'
        })
      } as never
    );

    const session = await service.loginWithGoogle('id-token');
    const profile = await service.getProfile('u1');

    expect(users.updateGoogleProfile).toHaveBeenCalledWith('u1', {
      googleId: 'gid-new',
      googlePictureUrl: 'https://google.test/avatar-new.jpg',
      emailVerified: true
    });
    expect(session.user.avatar?.url).toBe('https://google.test/avatar-new.jpg');
    expect(profile.avatar?.url).toBe('https://google.test/avatar-new.jpg');
  });



  it('uses frontend photoURL as fallback when verified token has no picture for existing google users', async () => {
    const existingGoogleUser = {
      ...baseUser,
      provider: 'google' as const,
      passwordHash: undefined,
      googleId: 'gid-old',
      updatedAt: new Date('2025-01-01')
    };

    const updatedGoogleUser = {
      ...existingGoogleUser,
      googleId: 'gid-new',
      googlePictureUrl: 'https://google.test/avatar-fallback.jpg',
      updatedAt: new Date('2025-02-01')
    };

    const users = {
      findByEmail: vi.fn().mockResolvedValue(existingGoogleUser),
      updateGoogleProfile: vi.fn().mockResolvedValue(updatedGoogleUser),
      updateLastLogin: vi.fn()
    };

    const sessions = {
      create: vi.fn()
    };

    const service = new AuthService(
      users as never,
      sessions as never,
      {} as never,
      undefined,
      {} as never,
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          googleId: 'gid-new',
          emailVerified: true,
          picture: null
        })
      } as never
    );

    await service.loginWithGoogle('id-token', 'https://google.test/avatar-fallback.jpg');

    expect(users.updateGoogleProfile).toHaveBeenCalledWith('u1', {
      googleId: 'gid-new',
      googlePictureUrl: 'https://google.test/avatar-fallback.jpg',
      emailVerified: true
    });
  });

  it('allows legacy Google provider casing and normalizes provider on update', async () => {
    const legacyGoogleUser = {
      ...baseUser,
      provider: 'Google',
      passwordHash: undefined,
      googleId: 'gid-old',
      updatedAt: new Date('2025-01-01')
    };

    const updatedGoogleUser = {
      ...legacyGoogleUser,
      provider: 'google' as const,
      googleId: 'gid-new',
      googlePictureUrl: 'https://google.test/avatar-new.jpg',
      updatedAt: new Date('2025-02-01')
    };

    const users = {
      findByEmail: vi.fn().mockResolvedValue(legacyGoogleUser),
      updateGoogleProfile: vi.fn().mockResolvedValue(updatedGoogleUser),
      updateLastLogin: vi.fn()
    };

    const sessions = {
      create: vi.fn()
    };

    const service = new AuthService(
      users as never,
      sessions as never,
      {} as never,
      undefined,
      {} as never,
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          googleId: 'gid-new',
          emailVerified: true,
          picture: 'https://google.test/avatar-new.jpg'
        })
      } as never
    );

    await service.loginWithGoogle('id-token');

    expect(users.updateGoogleProfile).toHaveBeenCalledWith('u1', {
      googleId: 'gid-new',
      googlePictureUrl: 'https://google.test/avatar-new.jpg',
      emailVerified: true
    });
  });

  it('keeps local users using manual avatar in profile', async () => {
    const localWithAvatar = {
      ...baseUser,
      provider: 'local' as const,
      avatar: {
        key: 'avatar-key',
        url: 'https://cdn.test/local-avatar.png',
        mimeType: 'image/png',
        sizeBytes: 123,
        width: 64,
        height: 64,
        updatedAt: new Date('2025-03-01')
      }
    };

    const users = {
      findById: vi.fn().mockResolvedValue(localWithAvatar)
    };

    const service = new AuthService(users as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const profile = await service.getProfile('u1');

    expect(profile.avatar?.url).toBe('https://cdn.test/local-avatar.png');
  });

  it('rotates refresh token on refresh session', async () => {
    const sessions = {
      findActiveByHash: vi.fn().mockResolvedValue({ userId: { toString: () => 'u1' } }),
      revokeByHash: vi.fn(),
      create: vi.fn()
    };

    const users = {
      findById: vi.fn().mockResolvedValue(baseUser),
      updateLastLogin: vi.fn()
    };

    const service = new AuthService(users as never, sessions as never, {} as never, undefined, {} as never, {} as never);

    const result = await service.refreshSession('refresh-token-1234567890');

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(sessions.revokeByHash).toHaveBeenCalledTimes(1);
    expect(sessions.create).toHaveBeenCalledTimes(1);
  });

  it('revokes all sessions on logoutAll', async () => {
    const sessions = {
      revokeAllByUserId: vi.fn()
    };
    const service = new AuthService({} as never, sessions as never, {} as never, {} as never, {} as never, {} as never);
    await service.logoutAll('u1');
    expect(sessions.revokeAllByUserId).toHaveBeenCalledWith('u1');
  });
});
