import bcrypt from 'bcryptjs';
import type { AuthSessionContextDto, AuthUserDto, UserRole } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import { ActionTokenRepository } from '../repositories/action-token.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { GoogleAuthService } from './google-auth.service.js';
import { MailService } from './mail.service.js';
import { TokenService } from './token.service.js';
import { OrganizationService } from '../../organizations/services/organization.service.js';

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
  context: AuthSessionContextDto;
}

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly sessions = new SessionRepository(),
    private readonly actionTokens = new ActionTokenRepository(),
    private readonly tokenService = new TokenService(),
    private readonly mailService = new MailService(),
    private readonly googleAuth = new GoogleAuthService(),
    private readonly organizationService = new OrganizationService()
  ) {}

  async registerLocal(
    inputOrEmail: { firstName: string; lastName: string; email: string; password: string } | string,
    maybePassword?: string
  ): Promise<AuthResult> {
    const input = typeof inputOrEmail === 'string'
      ? { firstName: 'New', lastName: 'User', email: inputOrEmail, password: maybePassword ?? '' }
      : inputOrEmail;

    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing && existing.provider !== 'local') {
      throw new AppError('PROVIDER_CONFLICT', 409, 'This email is already registered with Google sign-in');
    }
    if (existing) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 409, 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.users.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: normalizedEmail,
      provider: 'local',
      passwordHash,
      emailVerified: true,
      role: 'user',
      globalRole: 'user',
      status: 'active'
    });

    return this.createSession(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(token);
    const actionToken = await this.actionTokens.findActiveByHash(tokenHash, 'verify_email');
    if (!actionToken) {
      throw new AppError('INVALID_TOKEN', 400, 'Verification token is invalid or expired');
    }

    await this.users.markEmailVerified(actionToken.userId.toString());
    await this.actionTokens.consumeByHash(tokenHash);
  }

  async loginLocal(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }
    if (user.provider !== 'local') {
      throw new AppError('PROVIDER_CONFLICT', 409, 'This account uses Google sign-in');
    }
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }
    if (user.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'User account is not active');
    }

    return this.createSession(user);
  }

  async loginWithGoogle(idToken: string, photoURL: string | null = null): Promise<AuthResult> {
    const profile = await this.googleAuth.verifyIdToken(idToken);
    const googlePictureUrl = profile.picture ?? photoURL;
    const existing = await this.users.findByEmail(profile.email);
    const existingProvider = existing?.provider?.toLowerCase();

    if (existing && existingProvider !== 'google') {
      throw new AppError('PROVIDER_CONFLICT', 409, 'This email is already registered with email/password');
    }

    if (!existing) {
      const [localPart = 'Google'] = profile.email.split('@');
      const [firstName = 'Google', ...lastNameParts] = localPart.replace(/[._-]+/g, ' ').split(' ');
      const lastName = lastNameParts.join(' ');

      const user = await this.users.create({
      firstName: firstName || 'Google',
      lastName: lastName || 'User',
        email: profile.email,
        provider: 'google',
        googleId: profile.googleId,
        ...(googlePictureUrl ? { googlePictureUrl } : {}),
        emailVerified: profile.emailVerified,
        role: 'user',
        globalRole: 'user',
        status: 'active'
      });

      return this.createSession(user);
    }

    const refreshedUser = await this.users.updateGoogleProfile(existing._id.toString(), {
      googleId: profile.googleId,
      googlePictureUrl,
      emailVerified: profile.emailVerified
    });

    return this.createSession(refreshedUser);
  }

  async refreshSession(refreshToken: string): Promise<AuthResult> {
    const tokenHash = this.tokenService.hashToken(refreshToken);
    const currentSession = await this.sessions.findActiveByHash(tokenHash);
    if (!currentSession) {
      throw new AppError('INVALID_REFRESH_TOKEN', 401, 'Refresh token is invalid or expired');
    }

    await this.sessions.revokeByHash(tokenHash);
    const user = await this.users.findById(currentSession.userId.toString());
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    return this.createSession(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessions.revokeByHash(this.tokenService.hashToken(refreshToken));
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAllByUserId(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase().trim());
    if (!user || user.provider !== 'local') {
      return;
    }

    const rawToken = this.tokenService.generateRefreshToken();
    const tokenHash = this.tokenService.hashToken(rawToken);
    await this.actionTokens.consumeByUser(user._id.toString(), 'reset_password');
    await this.actionTokens.create({
      userId: user._id.toString(),
      tokenHash,
      type: 'reset_password',
      expiresAt: this.tokenService.getResetPasswordExpiryDate()
    });

    const resetUrl = `${env.WEB_BASE_URL}/reset-password?token=${rawToken}`;
    await this.mailService.sendResetPassword(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(token);
    const actionToken = await this.actionTokens.findActiveByHash(tokenHash, 'reset_password');
    if (!actionToken) {
      throw new AppError('INVALID_TOKEN', 400, 'Reset token is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.updatePasswordHash(actionToken.userId.toString(), passwordHash);
    await this.actionTokens.consumeByHash(tokenHash);
    await this.sessions.revokeAllByUserId(actionToken.userId.toString());
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || user.provider !== 'local' || !user.passwordHash) {
      throw new AppError('FORBIDDEN', 403, 'Password change is only available for local accounts');
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.updatePasswordHash(userId, passwordHash);
    await this.sessions.revokeAllByUserId(userId);
  }

  async getSessionContext(userId: string): Promise<AuthSessionContextDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    return this.buildSessionContext(user);
  }

  async getProfile(userId: string): Promise<AuthUserDto> {
    const context = await this.getSessionContext(userId);
    return context.user;
  }

  private mapGlobalRoleToLegacy(globalRole: 'super_admin' | 'user'): UserRole {
    return globalRole === 'super_admin' ? 'admin' : 'user';
  }

  private async buildSessionContext(user: NonNullable<Awaited<ReturnType<UserRepository['findById']>>>): Promise<AuthSessionContextDto> {
    let orgContext: Awaited<ReturnType<OrganizationService['getMyOrganizations']>> = {
      organizations: [],
      memberships: []
    };

    try {
      orgContext = await this.organizationService.getMyOrganizations(user._id.toString());
    } catch {
      orgContext = { organizations: [], memberships: [] };
    }
    const activeMemberships = orgContext.memberships.filter((membership) => membership.status === 'active');
    const activeOrganizationId = activeMemberships.length === 1 ? (activeMemberships[0]?.organizationId ?? null) : null;
    const globalRole = (user.globalRole ?? 'user') as 'super_admin' | 'user';

    return {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: this.mapGlobalRoleToLegacy(globalRole),
        globalRole,
        provider: user.provider,
        emailVerified: user.emailVerified,
        status: (user.status ?? 'active') as 'active' | 'inactive' | 'blocked',
        avatar: this.resolveUserAvatar(user)
      },
      organizations: orgContext.organizations,
      memberships: orgContext.memberships,
      activeOrganizationId
    };
  }

  private resolveUserAvatar(user: NonNullable<Awaited<ReturnType<UserRepository['findById']>>>): AuthUserDto['avatar'] {
    if (user.provider === 'google') {
      if (!user.googlePictureUrl) {
        return null;
      }

      return {
        url: user.googlePictureUrl,
        width: 0,
        height: 0,
        mimeType: 'image/jpeg',
        sizeBytes: 0,
        updatedAt: user.updatedAt.toISOString()
      };
    }

    if (!user.avatar) {
      return null;
    }

    return {
      url: user.avatar.url,
      width: user.avatar.width,
      height: user.avatar.height,
      mimeType: user.avatar.mimeType,
      sizeBytes: user.avatar.sizeBytes,
      updatedAt: user.avatar.updatedAt.toISOString()
    };
  }

  private async createAndSendVerifyEmail(userId: string, email: string): Promise<void> {
    const rawToken = this.tokenService.generateRefreshToken();
    await this.actionTokens.consumeByUser(userId, 'verify_email');
    await this.actionTokens.create({
      userId,
      tokenHash: this.tokenService.hashToken(rawToken),
      type: 'verify_email',
      expiresAt: this.tokenService.getEmailVerificationExpiryDate()
    });

    const verifyUrl = `${env.APP_BASE_URL}/api/auth/verify-email?token=${rawToken}`;
    await this.mailService.sendVerifyEmail(email, verifyUrl);
  }

  private async createSession(user: Awaited<ReturnType<UserRepository['findById']>>): Promise<AuthResult> {
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    const userId = user._id.toString();
    const refreshToken = this.tokenService.generateRefreshToken();
    const refreshHash = this.tokenService.hashToken(refreshToken);
    await this.sessions.create({
      userId,
      tokenHash: refreshHash,
      expiresAt: this.tokenService.getRefreshExpiryDate()
    });
    await this.users.updateLastLogin(userId);

    const globalRole = (user.globalRole ?? 'user') as 'super_admin' | 'user';
    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      role: this.mapGlobalRoleToLegacy(globalRole),
      globalRole,
      email: user.email
    });
    const context = await this.buildSessionContext(user);

    return {
      accessToken,
      refreshToken,
      user: context.user,
      context
    };
  }
}
