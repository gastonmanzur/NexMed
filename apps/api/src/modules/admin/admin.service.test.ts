import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  organizationCountDocuments: vi.fn(),
  organizationFind: vi.fn(),
  userCountDocuments: vi.fn(),
  userFind: vi.fn(),
  subscriptionAggregate: vi.fn(),
  subscriptionFind: vi.fn(),
  planFind: vi.fn()
}));

vi.mock('../organizations/models/organization.model.js', () => ({
  OrganizationModel: {
    countDocuments: mocks.organizationCountDocuments,
    find: mocks.organizationFind
  }
}));

vi.mock('../auth/models/user.model.js', () => ({
  UserModel: {
    countDocuments: mocks.userCountDocuments,
    find: mocks.userFind
  }
}));

vi.mock('../payments/models/organization-subscription.model.js', () => ({
  OrganizationSubscriptionModel: {
    aggregate: mocks.subscriptionAggregate,
    find: mocks.subscriptionFind
  }
}));

vi.mock('../payments/models/plan.model.js', () => ({ PlanModel: { find: mocks.planFind } }));
vi.mock('../push/services/push.service.js', () => ({ PushService: class {} }));
vi.mock('../payments/repositories/monetization-config.repository.js', () => ({ MonetizationConfigRepository: class {} }));
vi.mock('../feedback/services/feedback.service.js', () => ({ FeedbackService: class {} }));
vi.mock('../organizations/repositories/organization-settings.repository.js', () => ({ OrganizationSettingsRepository: class {} }));
vi.mock('../organizations/repositories/organization.repository.js', () => ({ OrganizationRepository: class {} }));
vi.mock('../payments/repositories/discount.repository.js', () => ({ DiscountRepository: class {} }));
vi.mock('../push/models/push-device.model.js', () => ({ PushDeviceModel: {} }));
vi.mock('../payments/models/payment-order.model.js', () => ({ PaymentOrderModel: {}, internalPaymentStatuses: [], orderTypes: [] }));
vi.mock('../payments/models/payment-transaction.model.js', () => ({ PaymentTransactionModel: {} }));
vi.mock('../payments/models/subscription.model.js', () => ({ SubscriptionModel: {} }));
vi.mock('../payments/models/monetization-config.model.js', () => ({ MonetizationConfigModel: {}, monetizationModes: [], subscriptionPeriodModes: [] }));
vi.mock('../organizations/models/organization-settings.model.js', () => ({ OrganizationSettingsModel: {} }));
vi.mock('../professionals/models/professional.model.js', () => ({ ProfessionalModel: {} }));
vi.mock('../patient/models/patient-organization-link.model.js', () => ({ PatientOrganizationLinkModel: {} }));
vi.mock('../appointments/models/appointment.model.js', () => ({ AppointmentModel: {} }));
vi.mock('../organizations/models/organization-member.model.js', () => ({ OrganizationMemberModel: {} }));

const chain = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(value)
});

const oid = (value: string) => ({ toString: () => value });

const makeSubscription = (organizationId: string, status: string, extra: Record<string, unknown> = {}) => ({
  _id: oid(`sub-${organizationId}`),
  organizationId: oid(organizationId),
  planId: oid('plan-pro'),
  status,
  provider: 'manual',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...extra
});

describe('AdminService.getGlobalSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.organizationCountDocuments.mockResolvedValue(0);
    mocks.userCountDocuments.mockResolvedValue(0);
    mocks.subscriptionAggregate.mockResolvedValue([
      { _id: 'active', count: 5 },
      { _id: 'trial', count: 1 },
      { _id: 'past_due', count: 1 },
      { _id: 'suspended', count: 1 },
      { _id: 'canceled', count: 1 }
    ]);

    const activeSubscriptions = [
      makeSubscription('normal', 'active'),
      makeSubscription('discounted', 'active', { finalAmount: 24_000, originalAmount: 30_000, discountType: 'percentage', discountValue: 20 }),
      makeSubscription('bonified', 'active', { finalAmount: 0, originalAmount: 30_000, discountType: 'percentage', discountValue: 100 }),
      makeSubscription('super-admin-org', 'active'),
      makeSubscription('legacy-admin-org', 'active')
    ];

    mocks.subscriptionFind.mockImplementation((query: { status?: unknown; organizationId?: unknown; expiresAt?: unknown }) => {
      if (query.status === 'active') return { lean: vi.fn().mockResolvedValue(activeSubscriptions) };
      if (query.status === 'trial') return chain([]);
      if (typeof query.status === 'object') return chain([]);
      if (query.organizationId) return { lean: vi.fn().mockResolvedValue([]) };
      return { lean: vi.fn().mockResolvedValue([]) };
    });

    mocks.organizationFind.mockImplementation((query?: { _id?: { $in?: Array<{ toString: () => string }> } }) => {
      const ids = query?._id?.$in?.map((id) => id.toString()) ?? [];
      const orgs = ids.map((id) => ({
        _id: oid(id),
        name: id,
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdByUserId: oid(id === 'super-admin-org' ? 'super-admin' : id === 'legacy-admin-org' ? 'legacy-admin' : `user-${id}`)
      }));
      return query?._id ? { lean: vi.fn().mockResolvedValue(orgs) } : chain([]);
    });

    mocks.userFind.mockImplementation((query?: { _id?: { $in?: Array<{ toString: () => string }> } }) => {
      const ids = query?._id?.$in?.map((id) => id.toString()) ?? [];
      return {
        lean: vi.fn().mockResolvedValue(
          ids.map((id) => ({
            _id: oid(id),
            role: id === 'legacy-admin' ? 'admin' : 'user',
            globalRole: id === 'super-admin' ? 'super_admin' : 'user'
          }))
        )
      };
    });

    mocks.planFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: oid('plan-pro'), billingPriceArs: 30_000, price: 30_000, name: 'Pro' }])
    });
  });

  it('sums only active billable subscriptions and excludes internal admin organizations', async () => {
    const { AdminService } = await import('./admin.service.js');
    const summary = await new AdminService().getGlobalSummary();

    expect(summary.estimatedMonthlyRevenue).toBe(54_000);
    expect(summary.paidOrganizations).toBe(2);
    expect(summary.bonifiedOrganizations).toBe(1);
  });

  it('does not sum trial, past_due, suspended or canceled subscriptions', async () => {
    const { AdminService } = await import('./admin.service.js');
    const summary = await new AdminService().getGlobalSummary();

    expect(summary.estimatedMonthlyRevenue).toBe(54_000);
    expect(summary.trialOrganizations).toBe(1);
    expect(summary.suspendedOrPastDueOrganizations).toBe(2);
    expect(summary.subscriptionsByStatus.canceled).toBe(1);
  });
});
