import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { env } from '../../../config/env.js';
import { AppError } from '../../../core/errors.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { OrganizationMemberRepository } from '../../organizations/repositories/organization-member.repository.js';
import { OrganizationModel } from '../../organizations/models/organization.model.js';
import { ProfessionalRepository } from '../repositories/professional.repository.js';
import { ProfessionalAccessInviteRepository } from '../repositories/professional-access-invite.repository.js';

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export class ProfessionalInviteService {
  constructor(
    private readonly invites = new ProfessionalAccessInviteRepository(),
    private readonly users = new UserRepository(),
    private readonly members = new OrganizationMemberRepository(),
    private readonly professionals = new ProfessionalRepository()
  ) {}

  async get(token: string) {
    const invite = await this.loadValidPendingInvite(token);
    const [professional, organization] = await Promise.all([
      this.professionals.findByIdInOrganization(invite.organizationId.toString(), invite.professionalId.toString()),
      OrganizationModel.findById(invite.organizationId).select('name displayName').lean()
    ]);
    if (!professional || !organization) throw new AppError('INVITE_INVALID', 404, 'La invitación no es válida.');
    return {
      valid: true,
      professional: { displayName: professional.displayName || `${professional.firstName} ${professional.lastName}`.trim() },
      organization: { name: organization.displayName || organization.name },
      email: invite.email
    };
  }

  async accept(token: string, input: { password: string; confirmPassword: string }) {
    if (input.password !== input.confirmPassword) throw new AppError('PASSWORD_MISMATCH', 400, 'Las contraseñas no coinciden.');
    if (input.password.length < 8) throw new AppError('WEAK_PASSWORD', 400, 'La contraseña debe tener al menos 8 caracteres.');
    const invite = await this.loadValidPendingInvite(token);
    const user = await this.users.findById(invite.userId.toString());
    if (!user || user.email !== invite.email) throw new AppError('INVITE_INVALID_USER', 400, 'La invitación no coincide con el usuario.');

    const passwordHash = await bcrypt.hash(input.password, 12);
    await this.users.updatePasswordHash(user._id.toString(), passwordHash);
    await this.users.markEmailVerified(user._id.toString());
    await this.members.upsertProfessionalMembership({
      organizationId: invite.organizationId.toString(),
      userId: user._id.toString(),
      role: 'professional',
      professionalId: invite.professionalId.toString(),
      status: 'active'
    });
    await this.professionals.updateByIdInOrganization(invite.organizationId.toString(), invite.professionalId.toString(), {
      userId: user._id.toString(),
      accessEnabled: true,
      accessUserId: user._id.toString(),
      accessEmail: invite.email
    });
    await this.invites.accept(invite._id.toString());
    return { success: true, message: 'Tu acceso profesional fue activado. Ya podés ingresar a NexMed.' };
  }

  private async loadValidPendingInvite(token: string) {
    const invite = await this.invites.findByTokenHash(hashToken(token));
    if (!invite) throw new AppError('INVITE_NOT_FOUND', 404, 'La invitación no existe o el enlace es incorrecto.');
    if (invite.status !== 'pending') throw new AppError('INVITE_NOT_PENDING', 400, 'La invitación ya fue usada, revocada o vencida.');
    if (invite.expiresAt.getTime() <= Date.now()) {
      await this.invites.expire(invite._id.toString());
      throw new AppError('INVITE_EXPIRED', 410, 'La invitación está vencida. Solicitá un nuevo enlace al centro.');
    }
    return invite;
  }
}

export const createProfessionalInviteToken = (): { token: string; tokenHash: string; inviteUrl: string; expiresAt: Date } => {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashToken(token),
    inviteUrl: `${env.WEB_BASE_URL}/professional-invite/${token}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
};
