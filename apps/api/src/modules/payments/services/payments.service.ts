import { randomUUID, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { MonetizationConfigRepository } from '../repositories/monetization-config.repository.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';
import { WebhookEventRepository } from '../repositories/webhook-event.repository.js';
import { MercadoPagoProvider } from '../providers/mercadopago.provider.js';
import type { PaymentProvider } from '../providers/payment-provider.js';

const normalizePaymentStatus = (status: string) => {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded') return 'refunded';
  if (status === 'in_process') return 'in_process';
  return 'pending';
};

const normalizeSubscriptionStatus = (status: string) => {
  if (status === 'authorized') return 'authorized';
  if (status === 'paused') return 'paused';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'expired') return 'ended';
  return 'pending';
};

const inProgressSubscriptionStatuses = new Set(['pending', 'authorized', 'paused'] as const);

export class PaymentsService {
  constructor(
    private readonly configRepository = new MonetizationConfigRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly paymentRepository = new PaymentRepository(),
    private readonly subscriptionRepository = new SubscriptionRepository(),
    private readonly webhookEventRepository = new WebhookEventRepository(),
    private readonly provider: PaymentProvider = new MercadoPagoProvider()
  ) {}

  async createOneTimePayment(input: { userId: string; title: string; amount: number; currency: string }) {
    const config = await this.configRepository.getConfig();
    if (config.monetizationMode === 'subscriptions_only') {
      throw new AppError('PAYMENT_MODE_DISABLED', 409, 'One-time payments are disabled by configuration');
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    const externalReference = `ord_${randomUUID()}`;
    const order = await this.paymentRepository.createOrder({
      userId: input.userId,
      type: 'one_time',
      description: input.title,
      amount: input.amount,
      currency: input.currency,
      externalReference
    });

    const checkout = await this.provider.createOneTimePayment({
      externalReference,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      payerEmail: user.email
    });

    await this.paymentRepository.updateOrderProviderData(String(order._id), {
      providerOrderId: checkout.providerOrderId,
      ...(checkout.preferenceId ? { providerPreferenceId: checkout.preferenceId } : {})
    });

    return {
      orderId: String(order._id),
      externalReference,
      checkoutUrl: checkout.initPoint,
      status: 'pending'
    };
  }

  async createSubscription(input: {
    userId: string;
    planCode: string;
    title: string;
    amount: number;
    currency: string;
    period: 'monthly' | 'yearly';
  }) {
    const config = await this.configRepository.getConfig();
    if (config.monetizationMode === 'one_time_only') {
      throw new AppError('PAYMENT_MODE_DISABLED', 409, 'Subscriptions are disabled by configuration');
    }
    if (config.subscriptionPeriodMode !== 'both' && config.subscriptionPeriodMode !== input.period) {
      throw new AppError('SUBSCRIPTION_PERIOD_DISABLED', 409, `Subscription period '${input.period}' is disabled by configuration`);
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }

    const existing = await this.subscriptionRepository.findByUserPlanPeriodWithStatuses(
      input.userId,
      input.planCode,
      input.period,
Array.from(inProgressSubscriptionStatuses)
    );

    if (existing) {
      throw new AppError('SUBSCRIPTION_ALREADY_EXISTS', 409, 'There is already an in-progress subscription for this plan and period');
    }

    const externalReference = `sub_${randomUUID()}`;
    const subscription = await this.subscriptionRepository.create({
      userId: input.userId,
      planCode: input.planCode,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      period: input.period,
      externalReference
    });

    const checkout = await this.provider.createSubscription({
      externalReference,
      reason: input.title,
      amount: input.amount,
      currency: input.currency,
      payerEmail: user.email,
      frequency: 1,
      frequencyType: input.period === 'monthly' ? 'months' : 'years'
    });

    await this.subscriptionRepository.updateProviderData(String(subscription._id), {
      providerPreapprovalId: checkout.providerOrderId,
      providerInitPoint: checkout.initPoint
    });

    return {
      subscriptionId: String(subscription._id),
      externalReference,
      providerPreapprovalId: checkout.providerOrderId,
      checkoutUrl: checkout.initPoint,
      status: 'pending'
    };
  }

  async getOrderStatus(orderId: string, actor: { userId: string; role: 'admin' | 'user' }, options?: { syncWithProvider?: boolean }) {
    const order = await this.paymentRepository.getOrderById(orderId);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404, 'Order not found');
    }
    if (actor.role !== 'admin' && String(order.userId) !== actor.userId) {
      throw new AppError('FORBIDDEN', 403, 'You cannot access this order');
    }

    if (options?.syncWithProvider === true && (order.status === 'pending' || order.status === 'in_process')) {
      await this.syncOrderByExternalReference(order.externalReference, String(order._id));
      const refreshedOrder = await this.paymentRepository.getOrderById(orderId);
      if (!refreshedOrder) {
        throw new AppError('ORDER_NOT_FOUND', 404, 'Order not found');
      }
      return refreshedOrder;
    }

    return order;
  }

  async getUserSubscriptionStatus(input: {
    userId: string;
    subscriptionId?: string;
    planCode?: string;
    period?: 'monthly' | 'yearly';
    syncWithProvider?: boolean;
  }) {
    const subscription = input.subscriptionId
      ? await this.subscriptionRepository.getById(input.subscriptionId)
      : await this.subscriptionRepository.findLatestByUser(input.userId, {
          ...(input.planCode ? { planCode: input.planCode } : {}),
          ...(input.period ? { period: input.period } : {})
        });

    if (!subscription || String(subscription.userId) !== input.userId) {
      throw new AppError('SUBSCRIPTION_NOT_FOUND', 404, 'Subscription not found');
    }

    if (input.syncWithProvider && subscription.providerPreapprovalId && inProgressSubscriptionStatuses.has(subscription.status as 'pending' | 'authorized' | 'paused')) {
      await this.syncSubscriptionByPreapprovalId(subscription.providerPreapprovalId, String(subscription._id));
      const refreshed = await this.subscriptionRepository.getById(String(subscription._id));
      if (!refreshed) {
        throw new AppError('SUBSCRIPTION_NOT_FOUND', 404, 'Subscription not found');
      }
      return refreshed;
    }

    return subscription;
  }

  async processWebhook(payload: { topic?: string; type?: string; data?: { id?: string } }, signatureHeader?: string) {
    const topic = payload.topic ?? payload.type;
    const externalId = payload.data?.id;
    if (!topic || !externalId) {
      throw new AppError('INVALID_WEBHOOK_PAYLOAD', 400, 'Invalid webhook payload');
    }

    if (!this.validateWebhookSignature(signatureHeader)) {
      logger.warn({ topic, externalId }, 'Rejected Mercado Pago webhook due to invalid signature');
      throw new AppError('INVALID_WEBHOOK_SIGNATURE', 400, 'Invalid webhook signature');
    }

    const eventKey = `${topic}:${externalId}`;
    const shouldProcess = await this.webhookEventRepository.registerIfFirst('mercadopago', eventKey, topic, payload);
    if (!shouldProcess) {
      logger.info({ topic, externalId }, 'Skipped duplicate Mercado Pago webhook event');
      return { ignored: true, reason: 'already_processed' as const };
    }

    if (topic === 'payment') {
      const payment = await this.provider.getPaymentStatus(externalId);
      await this.syncOrderByExternalReference(payment.externalReference);
      return { processed: true, topic };
    }

    if (topic === 'subscription_preapproval') {
      await this.syncSubscriptionByPreapprovalId(externalId);
      return { processed: true, topic };
    }

    return { ignored: true, reason: 'unsupported_topic' as const };
  }

  listAdminTransactions() {
    return this.paymentRepository.listTransactions();
  }

  listAdminSubscriptions() {
    return this.subscriptionRepository.list();
  }

  private async syncOrderByExternalReference(externalReference: string, expectedOrderId?: string): Promise<void> {
    const order = await this.paymentRepository.getOrderByExternalReference(externalReference);
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404, 'Order for payment operation not found');
    }
    if (expectedOrderId && String(order._id) !== expectedOrderId) {
      throw new AppError('ORDER_NOT_FOUND', 404, 'Order for payment operation not found');
    }

    const payment = await this.provider.getPaymentStatusByExternalReference(externalReference);
    if (!payment) {
      return;
    }

    const normalizedStatus = normalizePaymentStatus(payment.status);
    await this.paymentRepository.updateOrderStatus(String(order._id), normalizedStatus);
    await this.paymentRepository.upsertTransaction({
      orderId: String(order._id),
      providerPaymentId: payment.providerPaymentId,
      status: normalizedStatus,
      amount: payment.amount,
      currency: payment.currency,
      ...(payment.statusDetail ? { statusDetail: payment.statusDetail } : {}),
      ...(payment.methodType ? { methodType: payment.methodType } : {}),
      rawPayload: payment.rawPayload
    });
  }

  private async syncSubscriptionByPreapprovalId(providerPreapprovalId: string, expectedSubscriptionId?: string): Promise<void> {
    const status = await this.provider.getSubscriptionStatus(providerPreapprovalId);
    const normalizedStatus = normalizeSubscriptionStatus(status.status);
    const nextBillingDate = status.nextBillingDate ? new Date(status.nextBillingDate) : undefined;

    const updated = await this.subscriptionRepository.updateStatusByPreapprovalId(
      status.providerPreapprovalId,
      normalizedStatus,
      nextBillingDate
    );

    if (!updated && status.externalReference) {
      await this.subscriptionRepository.updateStatusByExternalReference(status.externalReference, normalizedStatus, nextBillingDate, {
        providerPreapprovalId: status.providerPreapprovalId
      });
    }

    if (expectedSubscriptionId) {
      const current = await this.subscriptionRepository.getById(expectedSubscriptionId);
      if (!current || current.providerPreapprovalId !== status.providerPreapprovalId) {
        throw new AppError('SUBSCRIPTION_NOT_FOUND', 404, 'Subscription not found');
      }
    }
  }

  private validateWebhookSignature(signatureHeader?: string): boolean {
    const webhookSecret =
      process.env.MERCADOPAGO_WEBHOOK_SECRET ?? process.env.MP_WEBHOOK_SECRET ?? env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    /**
     * NOTE:
     * This is intentionally a lightweight safeguard for sandbox/dev usage.
     * It validates only that the configured shared secret matches x-signature(v1).
     * It is NOT a full cryptographic verification of Mercado Pago's signature payload/hash.
     */
    const parsedSegments = signatureHeader
      .split(',')
      .map((segment) => segment.trim())
      .map((segment) => {
        const [key = '', ...rest] = segment.split('=');
        return { key: key.trim().toLowerCase(), value: rest.join('=').trim() };
      });

    const v1Value = parsedSegments.find((segment) => segment.key === 'v1')?.value;
    const fallbackValue = signatureHeader.trim();
    const candidate = v1Value || (env.NODE_ENV !== 'production' ? fallbackValue : '');
    if (!candidate) {
      return false;
    }

    const expected = Buffer.from(webhookSecret);
    const received = Buffer.from(candidate);
    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }
}
