import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { AppError } from '../../../core/errors.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { OrganizationMemberRepository } from '../../organizations/repositories/organization-member.repository.js';
import { ProfessionalRepository } from '../repositories/professional.repository.js';
import { ProfessionalAccessInviteRepository } from '../repositories/professional-access-invite.repository.js';
import { createProfessionalInviteToken } from './professional-invite.service.js';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export class ProfessionalAccessService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly members = new OrganizationMemberRepository(),
    private readonly professionals = new ProfessionalRepository(),
    private readonly invites = new ProfessionalAccessInviteRepository()
  ) {}

  async activate(organizationId: string, professionalId: string, input: { email: string; firstName?: string | undefined; lastName?: string | undefined }, actorUserId: string) {
    const email = normalizeEmail(input.email ?? '');
    if (!email || !email.includes('@')) throw new AppError('INVALID_EMAIL', 400, 'Valid email is required');

    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');

    const linked = await this.members.findActiveProfessionalLink(organizationId, professionalId);
    if (linked && linked.userId.toString() !== professional.accessUserId?.toString()) {
      throw new AppError('PROFESSIONAL_ACCESS_ALREADY_LINKED', 409, 'Professional already has an active access user');
    }

    let user = await this.users.findByEmail(email);
    const userAlreadyExisted = Boolean(user);
    const userHasPassword = Boolean(user?.passwordHash);
    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('base64url'), 12);
      user = await this.users.create({
        firstName: input.firstName?.trim() || professional.firstName,
        lastName: input.lastName?.trim() || professional.lastName,
        email,
        provider: 'local',
        passwordHash,
        emailVerified: false,
        role: 'user',
        globalRole: 'user',
        status: 'active'
      });
    }

    const membership = await this.members.upsertProfessionalMembership({ organizationId, userId: user._id.toString(), role: 'professional', professionalId, status: 'active' });
    const updated = await this.professionals.updateByIdInOrganization(organizationId, professionalId, { userId: user._id.toString(), accessEnabled: true, accessUserId: user._id.toString(), accessEmail: email });
    const invite = await this.createInvite(organizationId, professionalId, user._id.toString(), email, actorUserId);
    const message = userAlreadyExisted && userHasPassword
      ? 'Acceso profesional creado. El usuario ya existe y puede ingresar con su contraseña actual. También podés compartir este enlace para configurar una nueva contraseña.'
      : 'Acceso profesional creado. Compartí este enlace con el profesional para que configure su contraseña.';
    return { message, inviteUrl: invite.inviteUrl, inviteExpiresAt: invite.expiresAt.toISOString(), emailSent: false, smtpConfigured: false, userAlreadyExisted, userHasPassword, access: { enabled: true, email, userId: user._id.toString(), membershipId: membership._id.toString(), professionalId, inviteStatus: 'pending' }, professional: updated };
  }

  async resend(organizationId: string, professionalId: string, actorUserId: string) {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    const email = normalizeEmail(professional.accessEmail ?? professional.email ?? '');
    const userId = professional.accessUserId?.toString() ?? professional.userId?.toString();
    if (!email || !userId) throw new AppError('PROFESSIONAL_ACCESS_NOT_ENABLED', 400, 'Professional access is not enabled');
    const invite = await this.createInvite(organizationId, professionalId, userId, email, actorUserId);
    return { message: 'Acceso profesional creado. No hay envío de email configurado. Copiá este enlace y compartilo manualmente con el profesional.', inviteUrl: invite.inviteUrl, inviteExpiresAt: invite.expiresAt.toISOString(), emailSent: false, smtpConfigured: false, access: { enabled: true, email, userId, professionalId, inviteStatus: 'pending' } };
  }

  async deactivate(organizationId: string, professionalId: string) {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    await this.members.deactivateProfessionalMembership(organizationId, professionalId);
    await this.invites.revokePendingForProfessional(organizationId, professionalId);
    const updated = await this.professionals.updateByIdInOrganization(organizationId, professionalId, { accessEnabled: false, accessUserId: null, accessEmail: null, userId: null });
    return { message: 'Acceso profesional desactivado. El usuario y el profesional no fueron borrados.', professional: updated };
  }

  private async createInvite(organizationId: string, professionalId: string, userId: string, email: string, createdByUserId: string) {
    await this.invites.revokePendingForProfessional(organizationId, professionalId);
    const token = createProfessionalInviteToken();
    await this.invites.create({ organizationId, professionalId, userId, email, tokenHash: token.tokenHash, expiresAt: token.expiresAt, createdByUserId });
    return token;
  }
}
