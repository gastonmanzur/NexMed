import { randomBytes } from 'node:crypto';
import type {
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationOnboardingStatusDto,
  OrganizationProfileDto,
  OrganizationSettingsDto
} from '@starter/shared-types';
import { env } from '../../../config/env.js';
import { AppError } from '../../../core/errors.js';
import { AppointmentModel } from '../../appointments/models/appointment.model.js';
import { ProfessionalModel } from '../../professionals/models/professional.model.js';
import { PatientOrganizationLinkModel } from '../../patient/models/patient-organization-link.model.js';
import { WaitlistRequestModel } from '../../waitlist/models/waitlist-request.model.js';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository.js';
import { OrganizationRepository } from '../repositories/organization.repository.js';
import { OrganizationSettingsRepository } from '../repositories/organization-settings.repository.js';
import { OrganizationAccessLinkRepository } from '../repositories/organization-access-link.repository.js';
import { PlanRepository } from '../../payments/repositories/plan.repository.js';
import { OrganizationSubscriptionRepository } from '../../payments/repositories/organization-subscription.repository.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { MercadoPagoProvider } from '../../payments/providers/mercadopago.provider.js';

interface CreateOrganizationInput {
  name: string;
  type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
  contactEmail?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
}

interface UpdateOrganizationProfileInput {
  name: string;
  displayName?: string | undefined;
  type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
  contactEmail?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  city: string;
  country: string;
  description?: string | undefined;
  logoUrl?: string | undefined;
  timezone: string;
  locale?: string | undefined;
  currency?: string | undefined;
  patientCancellationAllowed?: boolean | undefined;
  patientCancellationHoursLimit?: number | undefined;
  patientRescheduleAllowed?: boolean | undefined;
  patientRescheduleHoursLimit?: number | undefined;
}

interface GetOrganizationForUserInput {
  actorUserId: string;
  actorGlobalRole: 'super_admin' | 'user';
  organizationId: string;
}

const ONBOARDING_REQUIRED_FIELDS = ['name', 'type', 'contactChannel', 'city', 'country', 'timezone'] as const;

export class OrganizationService {
  constructor(
    private readonly organizations = new OrganizationRepository(),
    private readonly members = new OrganizationMemberRepository(),
    private readonly settings = new OrganizationSettingsRepository(),
    private readonly accessLinks = new OrganizationAccessLinkRepository(),
    private readonly plans = new PlanRepository(),
    private readonly organizationSubscriptions = new OrganizationSubscriptionRepository(),
    private readonly users = new UserRepository(),
    private readonly paymentProvider = new MercadoPagoProvider()
  ) {}

  async createOrganization(actorUserId: string, input: CreateOrganizationInput): Promise<{ organization: OrganizationDto; membership: OrganizationMembershipDto }> {
    const baseSlug = this.slugify(input.name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    const createPayload = {
      name: input.name.trim(),
      displayName: input.name.trim(),
      slug,
      type: input.type,
      createdByUserId: actorUserId,
      onboardingCompleted: false,
      status: 'onboarding' as const
    };

    const contactEmail = this.normalizeOptionalEmail(input.contactEmail);
    const phone = this.normalizePhone(input.phone);
    const address = this.normalizeOptionalText(input.address);
    const city = this.normalizeOptionalText(input.city);
    const country = this.normalizeOptionalText(input.country);

    const organization = await this.organizations.create({
      ...createPayload,
      ...(contactEmail ? { contactEmail } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
      ...(city ? { city } : {}),
      ...(country ? { country } : {})
    });

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

  async getOrganizationForUser(input: GetOrganizationForUserInput): Promise<OrganizationDto> {
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

  async getProfileForUser(input: { organizationId: string; actorUserId: string }): Promise<OrganizationProfileDto> {
    const [organization, settings, membership] = await Promise.all([
      this.organizations.findById(input.organizationId),
      this.settings.findByOrganizationId(input.organizationId),
      this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId)
    ]);

    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    if (!membership || membership.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this organization');
    }

    const organizationDto = this.toOrganizationDto(organization);
    const onboarding = this.calculateOnboarding(organizationDto, settings ? this.toOrganizationSettingsDto(settings) : null);

    return {
      organization: organizationDto,
      settings: settings ? this.toOrganizationSettingsDto(settings) : null,
      membership: this.toMembershipDto(input.organizationId, membership.role, membership.status),
      onboarding
    };
  }

  async getOnboardingStatusForUser(input: { organizationId: string; actorUserId: string }): Promise<OrganizationOnboardingStatusDto> {
    const profile = await this.getProfileForUser(input);
    return profile.onboarding;
  }

  async getDashboardSummaryForUser(input: { organizationId: string; actorUserId: string }): Promise<{
    generatedAt: string;
    appointmentsToday: number;
    appointmentsNext7Days: number;
    recentCancellations: number;
    activeProfessionals: number;
    linkedPatients: number;
    activeWaitlistRequests: number;
  }> {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this organization');
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

    const endOfNext7Days = new Date(startOfToday);
    endOfNext7Days.setUTCDate(endOfNext7Days.getUTCDate() + 7);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const [appointmentsToday, appointmentsNext7Days, recentCancellations, activeProfessionals, linkedPatients, activeWaitlistRequests] =
      await Promise.all([
        AppointmentModel.countDocuments({
          organizationId: input.organizationId,
          startAt: { $gte: startOfToday, $lt: startOfTomorrow }
        }),
        AppointmentModel.countDocuments({
          organizationId: input.organizationId,
          startAt: { $gte: now, $lt: endOfNext7Days }
        }),
        AppointmentModel.countDocuments({
          organizationId: input.organizationId,
          status: { $in: ['canceled_by_staff', 'canceled_by_patient'] },
          updatedAt: { $gte: sevenDaysAgo }
        }),
        ProfessionalModel.countDocuments({
          organizationId: input.organizationId,
          status: 'active'
        }),
        PatientOrganizationLinkModel.countDocuments({
          organizationId: input.organizationId,
          status: 'active'
        }),
        WaitlistRequestModel.countDocuments({
          organizationId: input.organizationId,
          status: 'active'
        })
      ]);

    return {
      generatedAt: now.toISOString(),
      appointmentsToday,
      appointmentsNext7Days,
      recentCancellations,
      activeProfessionals,
      linkedPatients,
      activeWaitlistRequests
    };
  }

  async updateProfile(input: {
    organizationId: string;
    actorUserId: string;
    data: UpdateOrganizationProfileInput;
  }): Promise<OrganizationProfileDto> {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this organization');
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const normalizedInput = {
      name: input.data.name.trim(),
      displayName: this.normalizeOptionalText(input.data.displayName) ?? input.data.name.trim(),
      type: input.data.type,
      contactEmail: this.normalizeOptionalEmail(input.data.contactEmail),
      phone: this.normalizePhone(input.data.phone),
      address: this.normalizeOptionalText(input.data.address),
      city: input.data.city.trim(),
      country: input.data.country.trim(),
      description: this.normalizeOptionalText(input.data.description),
      logoUrl: this.normalizeOptionalText(input.data.logoUrl),
      timezone: input.data.timezone.trim(),
      locale: this.normalizeOptionalText(input.data.locale),
      currency: this.normalizeOptionalText(input.data.currency),
      patientCancellationAllowed: input.data.patientCancellationAllowed,
      patientCancellationHoursLimit: input.data.patientCancellationHoursLimit,
      patientRescheduleAllowed: input.data.patientRescheduleAllowed,
      patientRescheduleHoursLimit: input.data.patientRescheduleHoursLimit
    };

    const nextSettings = await this.settings.upsertByOrganizationId({
      organizationId: input.organizationId,
      timezone: normalizedInput.timezone,
      locale: normalizedInput.locale,
      currency: normalizedInput.currency,
      onboardingStep: 'completed_profile',
      ...(normalizedInput.patientCancellationAllowed !== undefined
        ? { patientCancellationAllowed: normalizedInput.patientCancellationAllowed }
        : {}),
      ...(normalizedInput.patientCancellationHoursLimit !== undefined
        ? { patientCancellationHoursLimit: normalizedInput.patientCancellationHoursLimit }
        : {}),
      ...(normalizedInput.patientRescheduleAllowed !== undefined
        ? { patientRescheduleAllowed: normalizedInput.patientRescheduleAllowed }
        : {}),
      ...(normalizedInput.patientRescheduleHoursLimit !== undefined
        ? { patientRescheduleHoursLimit: normalizedInput.patientRescheduleHoursLimit }
        : {})
    });

    const onboardingPreview = this.calculateOnboarding(
      {
        id: organization._id.toString(),
        name: normalizedInput.name,
        type: normalizedInput.type,
        contactEmail: normalizedInput.contactEmail ?? null,
        phone: normalizedInput.phone ?? null,
        city: normalizedInput.city,
        country: normalizedInput.country,
        onboardingCompleted: organization.onboardingCompleted ?? false,
        status: organization.status
      },
      this.toOrganizationSettingsDto(nextSettings)
    );

    const nextStatus = onboardingPreview.onboardingCompleted ? 'active' : 'onboarding';

    const updatedOrganization = await this.organizations.updateById(input.organizationId, {
      name: normalizedInput.name,
      displayName: normalizedInput.displayName,
      type: normalizedInput.type,
      contactEmail: normalizedInput.contactEmail,
      phone: normalizedInput.phone,
      address: normalizedInput.address,
      city: normalizedInput.city,
      country: normalizedInput.country,
      description: normalizedInput.description,
      logoUrl: normalizedInput.logoUrl,
      onboardingCompleted: onboardingPreview.onboardingCompleted,
      status: organization.status === 'blocked' ? 'blocked' : organization.status === 'suspended' ? 'suspended' : nextStatus
    });

    if (!updatedOrganization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    return {
      organization: this.toOrganizationDto(updatedOrganization),
      settings: this.toOrganizationSettingsDto(nextSettings),
      membership: this.toMembershipDto(input.organizationId, membership.role, membership.status),
      onboarding: this.calculateOnboarding(this.toOrganizationDto(updatedOrganization), this.toOrganizationSettingsDto(nextSettings))
    };
  }

  private calculateOnboarding(
    organization: Pick<OrganizationDto, 'id' | 'name' | 'type' | 'contactEmail' | 'phone' | 'city' | 'country' | 'status' | 'onboardingCompleted'>,
    settings: Pick<OrganizationSettingsDto, 'timezone'> | null
  ): OrganizationOnboardingStatusDto {
    const missingFields: string[] = [];

    if (!organization.name?.trim()) missingFields.push('name');
    if (!organization.type?.trim()) missingFields.push('type');
    if (!organization.contactEmail?.trim() && !organization.phone?.trim()) missingFields.push('contactChannel');
    if (!organization.city?.trim()) missingFields.push('city');
    if (!organization.country?.trim()) missingFields.push('country');
    if (!settings?.timezone?.trim()) missingFields.push('timezone');

    const onboardingCompleted = missingFields.length === 0;
    const nextStep = onboardingCompleted ? null : 'complete_organization_profile';

    return {
      organizationId: organization.id,
      status: organization.status,
      onboardingCompleted,
      missingFields,
      nextStep
    };
  }


  async getInviteLinkForUser(input: { organizationId: string; actorUserId: string }): Promise<{
    organizationId: string;
    token: string;
    status: 'active' | 'rotated' | 'disabled';
    invitePath: string;
    inviteUrl: string;
    qrValue: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to manage invite links');
    }

    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const existing = await this.accessLinks.findByOrganizationId(input.organizationId);
    const token = existing?.token ?? organization.slug ?? randomBytes(18).toString('base64url');
    const link = existing ?? (await this.accessLinks.upsertByOrganizationId({ organizationId: input.organizationId, token, status: 'active' }));

    const invitePath = `/join/${encodeURIComponent(link.token)}`;

    return {
      organizationId: input.organizationId,
      token: link.token,
      status: link.status,
      invitePath,
      inviteUrl: invitePath,
      qrValue: invitePath,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString()
    };
  }

  async regenerateInviteLinkForUser(input: { organizationId: string; actorUserId: string }) {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to regenerate invite links');
    }

    await this.accessLinks.upsertByOrganizationId({
      organizationId: input.organizationId,
      token: randomBytes(18).toString('base64url'),
      status: 'active'
    });

    return this.getInviteLinkForUser(input);
  }

  async listPlansForUser(): Promise<Array<{
    id: string;
    code: string;
    name: string;
    price: number;
    currency: string;
    maxProfessionalsActive: number;
    status: 'active' | 'inactive';
    description: string | null;
  }>> {
    await this.plans.ensureDefaults();
    const plans = await this.plans.listActive();

    return plans.map((plan) => ({
      id: plan._id.toString(),
      code: plan.code,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      maxProfessionalsActive: plan.maxProfessionalsActive,
      status: plan.status,
      description: plan.description ?? null
    }));
  }

  async getOrganizationSubscriptionForUser(input: { organizationId: string; actorUserId: string }) {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this organization');
    }

    await this.plans.ensureDefaults();

    let subscription = await this.organizationSubscriptions.findByOrganizationId(input.organizationId);
    if (!subscription) {
      const starter = await this.plans.findByCode('starter');
      if (!starter) throw new AppError('PLAN_NOT_FOUND', 404, 'Default plan not found');

      const now = new Date();
      const trialDays = env.DISABLE_FREE_TRIAL ? 0 : env.TRIAL_DAYS;
      if (trialDays <= 0) {
        subscription = await this.organizationSubscriptions.upsertByOrganizationId({
          organizationId: input.organizationId,
          planId: starter._id.toString(),
          provider: 'internal',
          status: 'past_due',
          startedAt: now,
          autoRenew: false
        });
      } else {
        const trialExpiresAt = new Date(now);
        trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

        subscription = await this.organizationSubscriptions.upsertByOrganizationId({
          organizationId: input.organizationId,
          planId: starter._id.toString(),
          provider: 'internal',
          status: 'trial',
          startedAt: now,
          expiresAt: trialExpiresAt,
          autoRenew: false
        });
      }
    }

    const plan = await this.plans.findById(subscription.planId.toString());
    if (!plan) throw new AppError('PLAN_NOT_FOUND', 404, 'Plan not found');

    return {
      subscription: {
        id: subscription._id.toString(),
        organizationId: subscription.organizationId.toString(),
        planId: subscription.planId.toString(),
        provider: subscription.provider,
        providerReference: subscription.providerReference ?? null,
        status: subscription.status,
        startedAt: subscription.startedAt ? subscription.startedAt.toISOString() : null,
        expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
        autoRenew: subscription.autoRenew ?? false,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString()
      },
      plan: {
        id: plan._id.toString(),
        code: plan.code,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        maxProfessionalsActive: plan.maxProfessionalsActive,
        status: plan.status,
        description: plan.description ?? null
      },
      limits: {
        maxProfessionalsActive: plan.maxProfessionalsActive
      }
    };
  }

  async startOrganizationCheckout(input: { organizationId: string; actorUserId: string; planId: string }) {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to manage organization subscription');
    }

    const plan = await this.plans.findById(input.planId);
    if (!plan || plan.status !== 'active') {
      throw new AppError('PLAN_NOT_FOUND', 404, 'Plan not found');
    }

    const actorUser = await this.users.findById(input.actorUserId);
    if (!actorUser) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    const checkout = await this.paymentProvider.createSubscription({
      externalReference: `org_${input.organizationId}_${randomBytes(8).toString('hex')}`,
      reason: `Suscripción ${plan.name} - NexMed`,
      amount: plan.price,
      currency: plan.currency,
      payerEmail: actorUser.email,
      frequency: 1,
      frequencyType: 'months'
    });

    const subscription = await this.organizationSubscriptions.upsertByOrganizationId({
      organizationId: input.organizationId,
      planId: plan._id.toString(),
      provider: 'mercadopago',
      providerReference: checkout.providerOrderId,
      status: 'past_due',
      startedAt: new Date(),
      autoRenew: true
    });

    return {
      checkoutUrl: checkout.initPoint,
      url: checkout.initPoint,
      initPoint: checkout.initPoint,
      subscriptionId: subscription._id.toString(),
      status: subscription.status
    };
  }

  async syncOrganizationSubscriptionForUser(input: { organizationId: string; actorUserId: string }) {
    const membership = await this.members.findByOrganizationAndUser(input.organizationId, input.actorUserId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this organization');
    }

    const current = await this.organizationSubscriptions.findByOrganizationId(input.organizationId);
    if (!current) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', 404, 'Subscription not found');
    }

    if (current.provider !== 'mercadopago' || !current.providerReference) {
      return this.getOrganizationSubscriptionForUser(input);
    }

    const providerStatus = await this.paymentProvider.getSubscriptionStatus(current.providerReference);
    const mappedStatus: 'active' | 'past_due' | 'suspended' | 'canceled' =
      providerStatus.status === 'authorized'
        ? 'active'
        : providerStatus.status === 'paused'
          ? 'suspended'
          : providerStatus.status === 'cancelled' || providerStatus.status === 'expired'
            ? 'canceled'
            : 'past_due';

    await this.organizationSubscriptions.upsertByOrganizationId({
      organizationId: input.organizationId,
      planId: current.planId.toString(),
      provider: current.provider,
      providerReference: current.providerReference,
      status: mappedStatus,
      startedAt: current.startedAt ?? new Date(),
      ...(current.expiresAt ? { expiresAt: current.expiresAt } : {}),
      ...(typeof current.autoRenew === 'boolean' ? { autoRenew: current.autoRenew } : {})
    });

    return this.getOrganizationSubscriptionForUser(input);
  }

  async getPlanLimitSnapshot(organizationId: string): Promise<{ maxProfessionalsActive: number; subscriptionStatus: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled' } | null> {
    await this.plans.ensureDefaults();
    const subscription = await this.organizationSubscriptions.findByOrganizationId(organizationId);
    if (!subscription) return null;

    const plan = await this.plans.findById(subscription.planId.toString());
    if (!plan) return null;

    return {
      maxProfessionalsActive: plan.maxProfessionalsActive,
      subscriptionStatus: subscription.status
    };
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

  private normalizePhone(value?: string): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return undefined;
    }

    return normalized.replace(/[^\d+()\-\s]/g, '').replace(/\s+/g, ' ');
  }

  private normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
  }

  private toOrganizationDto(org: {
    _id: { toString(): string };
    name: string;
    displayName?: string | null;
    slug?: string | null;
    type: OrganizationDto['type'];
    contactEmail?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    status: OrganizationDto['status'];
    onboardingCompleted?: boolean;
    createdByUserId: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationDto {
    return {
      id: org._id.toString(),
      name: org.name,
      displayName: org.displayName ?? null,
      slug: org.slug ?? null,
      type: org.type,
      contactEmail: org.contactEmail ?? null,
      phone: org.phone ?? null,
      address: org.address ?? null,
      city: org.city ?? null,
      country: org.country ?? null,
      description: org.description ?? null,
      logoUrl: org.logoUrl ?? null,
      status: org.status,
      onboardingCompleted: org.onboardingCompleted ?? false,
      createdByUserId: org.createdByUserId.toString(),
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString()
    };
  }

  private toOrganizationSettingsDto(settings: {
    organizationId: { toString(): string };
    timezone: string;
    locale?: string | null;
    currency?: string | null;
    onboardingStep?: string | null;
    patientCancellationAllowed?: boolean;
    patientCancellationHoursLimit?: number;
    patientRescheduleAllowed?: boolean;
    patientRescheduleHoursLimit?: number;
    betaEnabled?: boolean;
    betaStartedAt?: Date | null;
    betaNotes?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationSettingsDto {
    return {
      organizationId: settings.organizationId.toString(),
      timezone: settings.timezone,
      locale: settings.locale ?? null,
      currency: settings.currency ?? null,
      onboardingStep: settings.onboardingStep ?? null,
      patientCancellationAllowed: settings.patientCancellationAllowed ?? true,
      patientCancellationHoursLimit: settings.patientCancellationHoursLimit ?? 24,
      patientRescheduleAllowed: settings.patientRescheduleAllowed ?? true,
      patientRescheduleHoursLimit: settings.patientRescheduleHoursLimit ?? 24,
      betaEnabled: settings.betaEnabled ?? false,
      betaStartedAt: settings.betaStartedAt ? settings.betaStartedAt.toISOString() : null,
      betaNotes: settings.betaNotes ?? null,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString()
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

export type { UpdateOrganizationProfileInput };
export { ONBOARDING_REQUIRED_FIELDS };
