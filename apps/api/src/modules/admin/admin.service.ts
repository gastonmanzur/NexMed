import mongoose from 'mongoose';
import { AppError } from '../../core/errors.js';
import { UserModel } from '../auth/models/user.model.js';
import { PushService } from '../push/services/push.service.js';
import { PushDeviceModel } from '../push/models/push-device.model.js';
import { PaymentOrderModel, internalPaymentStatuses, orderTypes } from '../payments/models/payment-order.model.js';
import { PaymentTransactionModel } from '../payments/models/payment-transaction.model.js';
import { SubscriptionModel } from '../payments/models/subscription.model.js';
import { MonetizationConfigModel, monetizationModes, subscriptionPeriodModes } from '../payments/models/monetization-config.model.js';
import { MonetizationConfigRepository } from '../payments/repositories/monetization-config.repository.js';
import { FeedbackService } from '../feedback/services/feedback.service.js';
import { OrganizationSettingsRepository } from '../organizations/repositories/organization-settings.repository.js';
import { OrganizationRepository } from '../organizations/repositories/organization.repository.js';
import { OrganizationModel } from '../organizations/models/organization.model.js';
import { OrganizationSettingsModel } from '../organizations/models/organization-settings.model.js';
import { OrganizationSubscriptionModel } from '../payments/models/organization-subscription.model.js';
import { PlanModel } from '../payments/models/plan.model.js';
import { ProfessionalModel } from '../professionals/models/professional.model.js';
import { PatientOrganizationLinkModel } from '../patient/models/patient-organization-link.model.js';
import { AppointmentModel } from '../appointments/models/appointment.model.js';
import { OrganizationMemberModel } from '../organizations/models/organization-member.model.js';

export class AdminService {
  constructor(
    private readonly pushService = new PushService(),
    private readonly monetizationConfigRepository = new MonetizationConfigRepository(),
    private readonly feedbackService = new FeedbackService(),
    private readonly organizationSettingsRepository = new OrganizationSettingsRepository(),
    private readonly organizationRepository = new OrganizationRepository()
  ) {}

  async getDashboardSummary() {
    const [users, adminUsers, payments, subscriptions, pushDevices, usersWithAvatar] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: 'admin' }),
      PaymentTransactionModel.countDocuments(),
      SubscriptionModel.countDocuments(),
      PushDeviceModel.countDocuments({ status: 'active' }),
      UserModel.countDocuments({ avatar: { $exists: true } })
    ]);

    return {
      users,
      adminUsers,
      regularUsers: users - adminUsers,
      payments,
      subscriptions,
      pushDevices,
      usersWithAvatar
    };
  }


  async getGlobalSummary() {
    const [organizationsTotal, organizationsActive, onboardingPending, usersTotal, subscriptionsByStatus, recentOrganizations, expiringTrials] = await Promise.all([
      OrganizationModel.countDocuments(),
      OrganizationModel.countDocuments({ status: 'active' }),
      OrganizationModel.countDocuments({ onboardingCompleted: false }),
      UserModel.countDocuments(),
      OrganizationSubscriptionModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      OrganizationModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      OrganizationSubscriptionModel.find({ status: 'trial', expiresAt: { $ne: null } }).sort({ expiresAt: 1 }).limit(5).lean()
    ]);

    const subscriptionsByStatusMap = subscriptionsByStatus.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
    const paidOrganizations = subscriptionsByStatusMap.active ?? 0;
    const trialOrganizations = subscriptionsByStatusMap.trial ?? 0;
    const suspendedOrPastDueOrganizations = (subscriptionsByStatusMap.suspended ?? 0) + (subscriptionsByStatusMap.past_due ?? 0);
    const problematicSubscriptions = await OrganizationSubscriptionModel.find({ status: { $in: ['past_due', 'suspended'] } })
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();
    const activeSubscriptions = await OrganizationSubscriptionModel.find({ status: 'active' }).lean();
    const planIds = Array.from(new Set(activeSubscriptions.map((item) => item.planId.toString())));
    const plans = await PlanModel.find({ _id: { $in: planIds } }).lean();
    const plansById = new Map(plans.map((item) => [item._id.toString(), item]));
    const estimatedMonthlyRevenue = activeSubscriptions.reduce((acc, item) => acc + (plansById.get(item.planId.toString())?.price ?? 0), 0);

    const recentOrganizationIds = recentOrganizations.map((item) => item._id);
    const recentSubscriptions = await OrganizationSubscriptionModel.find({ organizationId: { $in: recentOrganizationIds } }).lean();
    const subscriptionByOrg = new Map(recentSubscriptions.map((item) => [item.organizationId.toString(), item]));

    const expiringTrialOrgIds = expiringTrials.map((item) => item.organizationId);
    const expiringTrialOrgs = await OrganizationModel.find({ _id: { $in: expiringTrialOrgIds } }).lean();
    const expiringTrialOrgById = new Map(expiringTrialOrgs.map((item) => [item._id.toString(), item]));

    const problematicOrgIds = problematicSubscriptions.map((item) => item.organizationId);
    const problematicOrgs = await OrganizationModel.find({ _id: { $in: problematicOrgIds } }).lean();
    const problematicOrgById = new Map(problematicOrgs.map((item) => [item._id.toString(), item]));

    return {
      totalOrganizations: organizationsTotal,
      activeOrganizations: organizationsActive,
      trialOrganizations,
      paidOrganizations,
      suspendedOrPastDueOrganizations,
      estimatedMonthlyRevenue,
      onboardingPending,
      usersTotal,
      subscriptionsByStatus: subscriptionsByStatusMap,
      recentOrganizations: recentOrganizations.map((organization) => {
        const subscription = subscriptionByOrg.get(organization._id.toString());
        return {
          id: organization._id.toString(),
          name: organization.displayName ?? organization.name,
          status: organization.status,
          subscriptionStatus: subscription?.status ?? 'trial',
          createdAt: organization.createdAt.toISOString()
        };
      }),
      expiringTrials: expiringTrials.map((subscription) => {
        const organization = expiringTrialOrgById.get(subscription.organizationId.toString());
        const expiresAt = subscription.expiresAt ?? null;
        return {
          organizationId: subscription.organizationId.toString(),
          organizationName: organization ? (organization.displayName ?? organization.name) : 'Organización',
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          daysRemaining: expiresAt ? Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000), 0) : null
        };
      }),
      problematicSubscriptions: problematicSubscriptions.map((subscription) => {
        const organization = problematicOrgById.get(subscription.organizationId.toString());
        return {
          organizationId: subscription.organizationId.toString(),
          organizationName: organization ? (organization.displayName ?? organization.name) : 'Organización',
          status: subscription.status,
          expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null
        };
      })
    };
  }

  async listOrganizations(filters: {
    page: number;
    limit: number;
    status?: 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';
    subscriptionStatus?: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
    planId?: string;
    search?: string;
    betaEnabled?: boolean;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [{ name: { $regex: filters.search, $options: 'i' } }, { displayName: { $regex: filters.search, $options: 'i' } }];
    }

    const skip = (filters.page - 1) * filters.limit;
    const [organizations, orgTotal] = await Promise.all([
      OrganizationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      OrganizationModel.countDocuments(query)
    ]);

    const organizationIds = organizations.map((item) => item._id);

    const [settings, subscriptions, professionalCounts, patientCounts] = await Promise.all([
      OrganizationSettingsModel.find({ organizationId: { $in: organizationIds } }).lean(),
      OrganizationSubscriptionModel.find({ organizationId: { $in: organizationIds } }).lean(),
      ProfessionalModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { organizationId: { $in: organizationIds } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } }
      ]),
      PatientOrganizationLinkModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { organizationId: { $in: organizationIds }, status: 'active' } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } }
      ])
    ]);

    const settingsByOrg = new Map(settings.map((item) => [item.organizationId.toString(), item]));
    const subscriptionsByOrg = new Map(subscriptions.map((item) => [item.organizationId.toString(), item]));
    const professionalCountByOrg = new Map(professionalCounts.map((item) => [item._id.toString(), item.count]));
    const patientCountByOrg = new Map(patientCounts.map((item) => [item._id.toString(), item.count]));
    const planIds = Array.from(new Set(subscriptions.map((item) => item.planId.toString())));
    const plans = await PlanModel.find({ _id: { $in: planIds } }).lean();
    const planById = new Map(plans.map((item) => [item._id.toString(), item]));

    const rows = organizations
      .map((organization) => {
        const organizationId = organization._id.toString();
        const setting = settingsByOrg.get(organizationId);
        const subscription = subscriptionsByOrg.get(organizationId);
        const plan = subscription ? planById.get(subscription.planId.toString()) : null;
        const expiresAt = subscription?.expiresAt ?? null;

        return {
          id: organizationId,
          name: organization.displayName ?? organization.name,
          status: organization.status,
          onboardingCompleted: organization.onboardingCompleted ?? false,
          betaEnabled: setting?.betaEnabled ?? false,
          subscriptionStatus: subscription?.status ?? 'trial',
          subscriptionPlanId: subscription?.planId?.toString() ?? null,
          subscriptionPlanName: plan?.name ?? null,
          trialEndsAt: expiresAt ? expiresAt.toISOString() : null,
          trialDaysRemaining:
            subscription?.status === 'trial' && expiresAt
              ? Math.max(Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000), 0)
              : null,
          professionalsCount: professionalCountByOrg.get(organizationId) ?? 0,
          patientsCount: patientCountByOrg.get(organizationId) ?? 0,
          createdAt: organization.createdAt.toISOString(),
          updatedAt: organization.updatedAt.toISOString()
        };
      })
      .filter((row) => (filters.subscriptionStatus ? row.subscriptionStatus === filters.subscriptionStatus : true))
      .filter((row) => (filters.planId ? row.subscriptionPlanId === filters.planId : true))
      .filter((row) => (typeof filters.betaEnabled === 'boolean' ? row.betaEnabled === filters.betaEnabled : true));

    return {
      items: rows,
      page: filters.page,
      limit: filters.limit,
      total: orgTotal
    };
  }

  async getOrganizationDetail(organizationId: string) {
    if (!mongoose.isValidObjectId(organizationId)) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'Invalid organization id');
    }

    const organization = await OrganizationModel.findById(organizationId).lean();
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const [settings, subscription, members, professionalsCount, patientsCount, appointmentsCount] = await Promise.all([
      OrganizationSettingsModel.findOne({ organizationId }).lean(),
      OrganizationSubscriptionModel.findOne({ organizationId }).lean(),
      OrganizationMemberModel.find({ organizationId, status: 'active', role: { $in: ['owner', 'admin'] } })
        .sort({ role: 1, createdAt: 1 })
        .lean(),
      ProfessionalModel.countDocuments({ organizationId }),
      PatientOrganizationLinkModel.countDocuments({ organizationId, status: 'active' }),
      AppointmentModel.countDocuments({ organizationId })
    ]);

    const ownerOrAdmin = members[0] ?? null;
    const ownerUser = ownerOrAdmin ? await UserModel.findById(ownerOrAdmin.userId, { firstName: 1, lastName: 1, email: 1 }).lean() : null;
    const plan = subscription ? await PlanModel.findById(subscription.planId).lean() : null;
    const trialEndsAt = subscription?.expiresAt ?? null;

    return {
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        displayName: organization.displayName ?? null,
        type: organization.type,
        status: organization.status,
        logoUrl: organization.logoUrl ?? null,
        createdAt: organization.createdAt.toISOString(),
        onboardingCompleted: organization.onboardingCompleted ?? false
      },
      commercial: {
        subscriptionStatus: subscription?.status ?? 'trial',
        provider: subscription?.provider ?? null,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        trialDaysRemaining:
          subscription?.status === 'trial' && trialEndsAt
            ? Math.max(Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000), 0)
            : null,
        autoRenew: subscription?.autoRenew ?? false
      },
      subscription: subscription
        ? {
            id: subscription._id.toString(),
            status: subscription.status,
            provider: subscription.provider,
            providerReference: subscription.providerReference ?? null,
            startedAt: subscription.startedAt ? subscription.startedAt.toISOString() : null,
            expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
            plan: plan
              ? {
                  id: plan._id.toString(),
                  code: plan.code,
                  name: plan.name,
                  price: plan.price,
                  currency: plan.currency,
                  maxProfessionalsActive: plan.maxProfessionalsActive
                }
              : null
          }
        : null,
      usage: {
        professionalsCount,
        patientsCount,
        appointmentsCount
      },
      owner: ownerUser
        ? {
            userId: ownerOrAdmin!.userId.toString(),
            role: ownerOrAdmin!.role,
            fullName: `${ownerUser.firstName} ${ownerUser.lastName}`.trim(),
            email: ownerUser.email
          }
        : null,
      settings: settings
        ? {
            betaEnabled: settings.betaEnabled ?? false,
            betaNotes: settings.betaNotes ?? null
          }
        : null,
      actions: {
        canUpdateCommercialStatus: true,
        canSuspendOrReactivate: true,
        canExtendTrial: false,
        pendingActionsNote: 'La extensión de trial requiere endpoint dedicado en una etapa posterior.'
      }
    };
  }

  async updateOrganizationStatus(input: {
    organizationId: string;
    status: 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';
    betaEnabled?: boolean;
    onboardingCompleted?: boolean;
  }) {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const updated = await this.organizationRepository.updateById(input.organizationId, {
      status: input.status,
      ...(input.onboardingCompleted !== undefined ? { onboardingCompleted: input.onboardingCompleted } : {})
    });

    if (!updated) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    if (input.betaEnabled !== undefined) {
      await this.organizationSettingsRepository.updateBetaByOrganizationId({
        organizationId: input.organizationId,
        betaEnabled: input.betaEnabled
      });
    }

    return {
      id: updated._id.toString(),
      status: updated.status,
      onboardingCompleted: updated.onboardingCompleted ?? false,
      updatedAt: updated.updatedAt.toISOString()
    };
  }

  async listUsers(filters: { search?: string; role?: 'admin' | 'user'; provider?: 'local' | 'google'; emailVerified?: boolean; hasAvatar?: boolean; limit: number; page: number }) {
    const query: Record<string, unknown> = {};

    if (filters.search) {
      query.email = { $regex: filters.search, $options: 'i' };
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.provider) {
      query.provider = filters.provider;
    }

    if (typeof filters.emailVerified === 'boolean') {
      query.emailVerified = filters.emailVerified;
    }

    if (typeof filters.hasAvatar === 'boolean') {
      query.avatar = filters.hasAvatar ? { $exists: true } : { $exists: false };
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      UserModel.countDocuments(query)
    ]);

    return {
      items: items.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        role: (user.globalRole ?? 'user') === 'super_admin' ? 'admin' : 'user',
        provider: user.provider,
        emailVerified: user.emailVerified,
        avatar: user.avatar
          ? {
              url: user.avatar.url,
              updatedAt: user.avatar.updatedAt.toISOString()
            }
          : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null
      })),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  async updateUserRole(actorUserId: string, targetUserId: string, role: 'admin' | 'user') {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('INVALID_USER_ID', 400, 'Invalid target user id');
    }

    if (actorUserId === targetUserId && role !== 'admin') {
      throw new AppError('ROLE_CHANGE_BLOCKED', 409, 'Admin cannot remove own admin role');
    }

    const globalRole = role === 'admin' ? 'super_admin' : 'user';
    const updated = await UserModel.findByIdAndUpdate(targetUserId, { $set: { role, globalRole } }, { new: true }).lean();
    if (!updated) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    return {
      id: updated._id.toString(),
      email: updated.email,
      role: updated.globalRole === 'super_admin' ? 'admin' : 'user',
      provider: updated.provider,
      emailVerified: updated.emailVerified
    };
  }

  async listPayments(filters: { status?: (typeof internalPaymentStatuses)[number]; type?: (typeof orderTypes)[number]; userId?: string; limit: number; page: number }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.userId) query.userId = filters.userId;

    const skip = (filters.page - 1) * filters.limit;
    const [orders, total] = await Promise.all([
      PaymentOrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean(),
      PaymentOrderModel.countDocuments(query)
    ]);

    const userIds = Array.from(new Set(orders.map((order) => order.userId.toString())));
    const orderIds = orders.map((order) => order._id);

    const [users, transactions] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }, { email: 1 }).lean(),
      PaymentTransactionModel.find({ orderId: { $in: orderIds } }).lean()
    ]);

    const usersMap = new Map(users.map((user) => [user._id.toString(), user.email]));
    const txMap = new Map(transactions.map((tx) => [tx.orderId.toString(), tx]));

    return {
      items: orders.map((order) => {
        const transaction = txMap.get(order._id.toString());
        return {
          id: order._id.toString(),
          type: order.type,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          userId: order.userId.toString(),
          userEmail: usersMap.get(order.userId.toString()) ?? null,
          externalReference: order.externalReference,
          providerOrderId: order.providerOrderId ?? null,
          transactionId: transaction?._id.toString() ?? null,
          methodType: transaction?.methodType ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString()
        };
      }),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  async listSubscriptions(filters: {
    status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
    planId?: string;
    search?: string;
    limit: number;
    page: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.planId) query.planId = filters.planId;
    if (filters.search) {
      const organizations = await OrganizationModel.find({
        $or: [{ name: { $regex: filters.search, $options: 'i' } }, { displayName: { $regex: filters.search, $options: 'i' } }]
      })
        .select({ _id: 1 })
        .lean();
      const organizationIds = organizations.map((item) => item._id);
      if (organizationIds.length === 0) {
        return { items: [], total: 0, page: filters.page, limit: filters.limit };
      }
      query.organizationId = { $in: organizationIds };
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      OrganizationSubscriptionModel.find(query).sort({ updatedAt: -1 }).skip(skip).limit(filters.limit).lean(),
      OrganizationSubscriptionModel.countDocuments(query)
    ]);

    const organizationIds = Array.from(new Set(items.map((item) => item.organizationId.toString())));
    const planIds = Array.from(new Set(items.map((item) => item.planId.toString())));
    const [organizations, plans] = await Promise.all([
      OrganizationModel.find({ _id: { $in: organizationIds } }).lean(),
      PlanModel.find({ _id: { $in: planIds } }).lean()
    ]);
    const organizationsById = new Map(organizations.map((item) => [item._id.toString(), item]));
    const plansById = new Map(plans.map((item) => [item._id.toString(), item]));

    return {
      items: items.map((subscription) => ({
        id: subscription._id.toString(),
        organizationId: subscription.organizationId.toString(),
        organizationName: organizationsById.get(subscription.organizationId.toString())?.displayName ??
          organizationsById.get(subscription.organizationId.toString())?.name ??
          'Organización',
        status: subscription.status,
        planId: subscription.planId.toString(),
        planName: plansById.get(subscription.planId.toString())?.name ?? null,
        monthlyAmount: plansById.get(subscription.planId.toString())?.price ?? null,
        currency: plansById.get(subscription.planId.toString())?.currency ?? null,
        provider: subscription.provider,
        startedAt: subscription.startedAt ? subscription.startedAt.toISOString() : null,
        renewalOrExpiryAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
        isPaymentIssue: subscription.status === 'past_due' || subscription.status === 'suspended',
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString()
      })),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  sendNotification(input: { actorUserId: string; actorRole: 'admin' | 'user'; targetUserId: string; title: string; body: string }) {
    return this.pushService.sendToUser(input);
  }

  async listAvatars(filters: { hasAvatar?: boolean; search?: string; limit: number; page: number }) {
    const query: Record<string, unknown> = {};
    if (typeof filters.hasAvatar === 'boolean') {
      query.avatar = filters.hasAvatar ? { $exists: true } : { $exists: false };
    }
    if (filters.search) {
      query.email = { $regex: filters.search, $options: 'i' };
    }

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      UserModel.find(query).sort({ updatedAt: -1 }).skip(skip).limit(filters.limit).lean(),
      UserModel.countDocuments(query)
    ]);

    return {
      items: items.map((item) => ({
        userId: item._id.toString(),
        email: item.email,
        hasAvatar: Boolean(item.avatar),
        avatarUrl: item.avatar?.url ?? null,
        avatarUpdatedAt: item.avatar?.updatedAt ? item.avatar.updatedAt.toISOString() : null,
        updatedAt: item.updatedAt.toISOString()
      })),
      total,
      page: filters.page,
      limit: filters.limit
    };
  }

  async deleteAvatar(actorUserId: string, targetUserId: string, actorRole: 'admin' | 'user') {
    if (actorRole !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Insufficient permissions');
    }
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('INVALID_USER_ID', 400, 'Invalid target user id');
    }
    const user = await UserModel.findById(targetUserId).lean();
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }
    await UserModel.updateOne({ _id: targetUserId }, { $unset: { avatar: '' } }).exec();
    return { actorUserId };
  }


  listFeedback(filters: {
    status?: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
    category?: 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
    limit: number;
    page: number;
  }) {
    return this.feedbackService.listAdminFeedback(filters);
  }

  updateFeedback(input: {
    feedbackId: string;
    status: 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';
    adminNotes?: string | undefined;
    severity?: 'critical' | 'high' | 'medium' | 'low' | undefined;
  }) {
    return this.feedbackService.updateAdminFeedback(input);
  }

  async updateOrganizationBeta(input: { organizationId: string; betaEnabled: boolean; betaNotes?: string | undefined }) {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not found');
    }

    const settings = await this.organizationSettingsRepository.updateBetaByOrganizationId(input);

    return {
      organizationId: settings.organizationId.toString(),
      betaEnabled: settings.betaEnabled ?? false,
      betaStartedAt: settings.betaStartedAt ? settings.betaStartedAt.toISOString() : null,
      betaNotes: settings.betaNotes ?? null,
      updatedAt: settings.updatedAt.toISOString()
    };
  }

  getMonetizationConfig() {
    return this.monetizationConfigRepository.getConfig();
  }

  async updateMonetizationConfig(input: { monetizationMode: (typeof monetizationModes)[number]; subscriptionPeriodMode: (typeof subscriptionPeriodModes)[number] }) {
    const config = await MonetizationConfigModel.findOneAndUpdate(
      { singletonKey: 'default' },
      { $set: input, $setOnInsert: { singletonKey: 'default' } },
      { upsert: true, new: true }
    ).lean();

    return {
      monetizationMode: config.monetizationMode,
      subscriptionPeriodMode: config.subscriptionPeriodMode
    };
  }
}
