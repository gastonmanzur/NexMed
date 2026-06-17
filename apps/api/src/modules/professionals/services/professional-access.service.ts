import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { AppError } from '../../../core/errors.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { OrganizationMemberRepository } from '../../organizations/repositories/organization-member.repository.js';
import { ProfessionalRepository } from '../repositories/professional.repository.js';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export class ProfessionalAccessService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly members = new OrganizationMemberRepository(),
    private readonly professionals = new ProfessionalRepository()
  ) {}

  async activate(organizationId: string, professionalId: string, input: { email: string; firstName?: string | undefined; lastName?: string | undefined }) {
    const email = normalizeEmail(input.email ?? '');
    if (!email || !email.includes('@')) throw new AppError('INVALID_EMAIL', 400, 'Valid email is required');

    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');

    const linked = await this.members.findActiveProfessionalLink(organizationId, professionalId);
    if (linked && linked.userId.toString() !== professional.accessUserId?.toString()) {
      throw new AppError('PROFESSIONAL_ACCESS_ALREADY_LINKED', 409, 'Professional already has an active access user');
    }

    let user = await this.users.findByEmail(email);
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

    const membership = await this.members.upsertProfessionalMembership({
      organizationId,
      userId: user._id.toString(),
      role: 'professional',
      professionalId,
      status: 'active'
    });

    const updated = await this.professionals.updateByIdInOrganization(organizationId, professionalId, {
      userId: user._id.toString(),
      accessEnabled: true,
      accessUserId: user._id.toString(),
      accessEmail: email
    });

    return {
      message: 'Acceso profesional creado. El profesional puede recuperar contraseña desde el login.',
      access: { enabled: true, email, userId: user._id.toString(), membershipId: membership._id.toString(), professionalId },
      professional: updated
    };
  }

  async resend(organizationId: string, professionalId: string) {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    return { message: 'Acceso profesional creado. El profesional puede recuperar contraseña desde el login.' };
  }

  async deactivate(organizationId: string, professionalId: string) {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    await this.members.deactivateProfessionalMembership(organizationId, professionalId);
    const updated = await this.professionals.updateByIdInOrganization(organizationId, professionalId, {
      accessEnabled: false,
      accessUserId: null,
      accessEmail: null,
      userId: null
    });
    return { message: 'Acceso profesional desactivado.', professional: updated };
  }
}
