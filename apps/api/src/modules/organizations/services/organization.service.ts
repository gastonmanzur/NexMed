import type { OrganizationDto, OrganizationMembershipDto } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository.js';
import { OrganizationRepository } from '../repositories/organization.repository.js';

interface CreateOrganizationInput {
  name: string;
  type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
  contactEmail?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
}

export class OrganizationService {
  constructor(
    private readonly organizations = new OrganizationRepository(),
    private readonly members = new OrganizationMemberRepository()
  ) {}

  async createOrganization(actorUserId: string, input: CreateOrganizationInput): Promise<{ organization: OrganizationDto; membership: OrganizationMembershipDto }> {
    const baseSlug = this.slugify(input.name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    const createPayload: {
      name: string;
      slug?: string;
      type: CreateOrganizationInput['type'];
      contactEmail?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      createdByUserId: string;
    } = {
      name: input.name.trim(),
      slug,
      type: input.type,
      createdByUserId: actorUserId
    };

    const contactEmail = this.normalizeOptionalEmail(input.contactEmail);
    const phone = this.normalizeOptionalText(input.phone);
    const address = this.normalizeOptionalText(input.address);
    const city = this.normalizeOptionalText(input.city);
    const country = this.normalizeOptionalText(input.country);

    if (contactEmail) createPayload.contactEmail = contactEmail;
    if (phone) createPayload.phone = phone;
    if (address) createPayload.address = address;
    if (city) createPayload.city = city;
    if (country) createPayload.country = country;

    const organization = await this.organizations.create(createPayload);

    const membership = await this.members.create({
      organizationId: organization._id.toString(),
      userId: actorUserId,
      role: 'owner',
      status: 'active'
    });

    return {
      organization: this.toOrganizationDto(organization),
      membership: this.toMembershipDto(membership.organizationId.toString(), membership.role, membership.status)
    };
  }

  async getMyOrganizations(userId: string): Promise<{ organizations: OrganizationDto[]; memberships: OrganizationMembershipDto[] }> {
    const memberships = await this.members.findByUser(userId);
    if (memberships.length === 0) {
      return { organizations: [], memberships: [] };
    }

    const organizations = await this.organizations.findByIds(memberships.map((membership) => membership.organizationId.toString()));

    return {
      organizations: organizations.map((organization) => this.toOrganizationDto(organization)),
      memberships: memberships.map((membership) =>
        this.toMembershipDto(membership.organizationId.toString(), membership.role, membership.status)
      )
    };
  }

  async getOrganizationForUser(input: { actorUserId: string; actorGlobalRole: 'super_admin' | 'user'; organizationId: string }): Promise<OrganizationDto> {
    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    if (input.actorGlobalRole !== 'super_admin') {
      const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
      if (!membership || membership.status !== 'active') {
        throw new AppError('FORBIDDEN', 403, 'You do not have access to this organization');
      }
    }

    return this.toOrganizationDto(organization);
  }

  async getMembershipForUser(organizationId: string, userId: string): Promise<OrganizationMembershipDto> {
    const membership = await this.members.findByOrganizationAndUser(organizationId, userId);
    if (!membership) {
      throw new AppError('MEMBERSHIP_NOT_FOUND', 404, 'Membership not found');
    }

    return this.toMembershipDto(organizationId, membership.role, membership.status);
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    if (!baseSlug) {
      return '';
    }

    let suffix = 0;
    let candidate = baseSlug;

    while (candidate) {
      const existing = await this.organizations.findBySlug(candidate);
      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }

    throw new AppError('INVALID_ORGANIZATION_SLUG', 400, 'Invalid organization slug');
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 80);
  }

  private normalizeOptionalEmail(value?: string): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    return normalized ? normalized.toLowerCase() : undefined;
  }

  private normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
  }

  private toOrganizationDto(org: {
    _id: { toString(): string };
    name: string;
    slug?: string | null;
    type: OrganizationDto['type'];
    contactEmail?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    status: OrganizationDto['status'];
    createdByUserId: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationDto {
    return {
      id: org._id.toString(),
      name: org.name,
      slug: org.slug ?? null,
      type: org.type,
      contactEmail: org.contactEmail ?? null,
      phone: org.phone ?? null,
      address: org.address ?? null,
      city: org.city ?? null,
      country: org.country ?? null,
      status: org.status,
      createdByUserId: org.createdByUserId.toString(),
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString()
    };
  }

  toMembershipDto(
    organizationId: string,
    role: OrganizationMembershipDto['role'],
    status: OrganizationMembershipDto['status']
  ): OrganizationMembershipDto {
    return {
      organizationId,
      role,
      status
    };
  }
}
