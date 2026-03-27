import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/errors.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService', () => {
  it('rejects one-time payment when mode is subscriptions_only', async () => {
    const service = new PaymentsService(
      { getConfig: vi.fn().mockResolvedValue({ monetizationMode: 'subscriptions_only', subscriptionPeriodMode: 'both' }) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(service.createOneTimePayment({ userId: 'u1', title: 'Plan', amount: 10, currency: 'ARS' })).rejects.toBeInstanceOf(AppError);
  });

  it('creates one-time payment when enabled', async () => {
    const createOrder = vi.fn().mockResolvedValue({ _id: 'ord1' });
    const service = new PaymentsService(
      { getConfig: vi.fn().mockResolvedValue({ monetizationMode: 'both', subscriptionPeriodMode: 'both' }) } as never,
      { findById: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@test.com' }) } as never,
      { createOrder, updateOrderProviderData: vi.fn() } as never,
      {} as never,
      {} as never,
      {
        createOneTimePayment: vi.fn().mockResolvedValue({ providerOrderId: 'mp1', preferenceId: 'mp1', initPoint: 'https://checkout' })
      } as never
    );

    const result = await service.createOneTimePayment({ userId: 'u1', title: 'Plan', amount: 10, currency: 'ARS' });
    expect(createOrder).toHaveBeenCalled();
    expect(result.checkoutUrl).toContain('checkout');
  });

  it('creates subscription when mode and period are enabled', async () => {
    const service = new PaymentsService(
      { getConfig: vi.fn().mockResolvedValue({ monetizationMode: 'both', subscriptionPeriodMode: 'both' }) } as never,
      { findById: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@test.com' }) } as never,
      {} as never,
      {
        findByUserPlanPeriodWithStatuses: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ _id: 'sub1' }),
        updateProviderData: vi.fn()
      } as never,
      {} as never,
      { createSubscription: vi.fn().mockResolvedValue({ providerOrderId: 'pre1', initPoint: 'https://checkout-sub' }) } as never
    );

    const result = await service.createSubscription({
      userId: 'u1',
      planCode: 'pro_monthly',
      title: 'Plan Pro mensual',
      amount: 1990,
      currency: 'ARS',
      period: 'monthly'
    });

    expect(result.checkoutUrl).toContain('checkout-sub');
  });

  it('blocks duplicate in-progress subscriptions', async () => {
    const service = new PaymentsService(
      { getConfig: vi.fn().mockResolvedValue({ monetizationMode: 'both', subscriptionPeriodMode: 'both' }) } as never,
      { findById: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@test.com' }) } as never,
      {} as never,
      { findByUserPlanPeriodWithStatuses: vi.fn().mockResolvedValue({ _id: 'sub-existing', status: 'authorized' }) } as never,
      {} as never,
      {} as never
    );

    await expect(
      service.createSubscription({
        userId: 'u1',
        planCode: 'pro_monthly',
        title: 'Plan Pro mensual',
        amount: 1990,
        currency: 'ARS',
        period: 'monthly'
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects invalid webhook payload', async () => {
    const service = new PaymentsService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.processWebhook({ topic: 'payment' })).rejects.toBeInstanceOf(AppError);
  });

  it('processes webhook idempotently', async () => {
    const service = new PaymentsService(
      {} as never,
      {} as never,
      {
        getOrderByExternalReference: vi.fn().mockResolvedValue({ _id: 'ord1' }),
        updateOrderStatus: vi.fn(),
        upsertTransaction: vi.fn()
      } as never,
      {} as never,
      { registerIfFirst: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) } as never,
      {
        getPaymentStatus: vi.fn().mockResolvedValue({
          providerPaymentId: '123',
          externalReference: 'ref',
          status: 'approved',
          amount: 10,
          currency: 'ARS'
        }),
        getPaymentStatusByExternalReference: vi.fn().mockResolvedValue({
          providerPaymentId: '123',
          externalReference: 'ref',
          status: 'approved',
          amount: 10,
          currency: 'ARS'
        })
      } as never
    );

    const first = await service.processWebhook({ topic: 'payment', data: { id: '123' } });
    const second = await service.processWebhook({ topic: 'payment', data: { id: '123' } });

    expect(first).toEqual({ processed: true, topic: 'payment' });
    expect(second).toEqual({ ignored: true, reason: 'already_processed' });
  });

  it('syncs pending order when requested', async () => {
    const getOrderById = vi
      .fn()
      .mockResolvedValueOnce({ _id: 'ord1', userId: 'u1', status: 'pending', externalReference: 'ref' })
      .mockResolvedValueOnce({ _id: 'ord1', userId: 'u1', status: 'approved', externalReference: 'ref' });
    const service = new PaymentsService(
      {} as never,
      {} as never,
      {
        getOrderById,
        getOrderByExternalReference: vi.fn().mockResolvedValue({ _id: 'ord1' }),
        updateOrderStatus: vi.fn(),
        upsertTransaction: vi.fn()
      } as never,
      {} as never,
      {} as never,
      {
        getPaymentStatusByExternalReference: vi.fn().mockResolvedValue({
          providerPaymentId: 'p1',
          externalReference: 'ref',
          status: 'approved',
          amount: 10,
          currency: 'ARS'
        })
      } as never
    );

    const result = await service.getOrderStatus('ord1', { userId: 'u1', role: 'user' }, { syncWithProvider: true });
    expect(result.status).toBe('approved');
  });

  it('syncs user subscription status when requested', async () => {
    const repository = {
      getById: vi
        .fn()
        .mockResolvedValueOnce({ _id: 'sub1', userId: 'u1', status: 'pending', providerPreapprovalId: 'pre1' })
        .mockResolvedValueOnce({ _id: 'sub1', userId: 'u1', status: 'authorized', providerPreapprovalId: 'pre1' })
        .mockResolvedValueOnce({ _id: 'sub1', userId: 'u1', status: 'authorized', providerPreapprovalId: 'pre1' }),
      updateStatusByPreapprovalId: vi.fn().mockResolvedValue({ _id: 'sub1' })
    };
    const service = new PaymentsService(
      {} as never,
      {} as never,
      {} as never,
      repository as never,
      {} as never,
      {
        getSubscriptionStatus: vi.fn().mockResolvedValue({
          providerPreapprovalId: 'pre1',
          externalReference: 'sub_ref',
          status: 'authorized'
        })
      } as never
    );

    const result = await service.getUserSubscriptionStatus({ userId: 'u1', subscriptionId: 'sub1', syncWithProvider: true });
    expect(result.status).toBe('authorized');
  });

  it('rejects webhook when signature is missing and secret is configured', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'whsec_test';
    const service = new PaymentsService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    await expect(service.processWebhook({ topic: 'payment', data: { id: '123' } })).rejects.toBeInstanceOf(AppError);
  });

  it('accepts webhook signature using v1 format', async () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'whsec_test';
    const service = new PaymentsService(
      {} as never,
      {} as never,
      {
        getOrderByExternalReference: vi.fn().mockResolvedValue({ _id: 'ord1' }),
        updateOrderStatus: vi.fn(),
        upsertTransaction: vi.fn()
      } as never,
      {} as never,
      { registerIfFirst: vi.fn().mockResolvedValue(true) } as never,
      {
        getPaymentStatus: vi.fn().mockResolvedValue({
          providerPaymentId: '123',
          externalReference: 'ref',
          status: 'approved',
          amount: 10,
          currency: 'ARS'
        }),
        getPaymentStatusByExternalReference: vi.fn().mockResolvedValue({
          providerPaymentId: '123',
          externalReference: 'ref',
          status: 'approved',
          amount: 10,
          currency: 'ARS'
        })
      } as never
    );

    const result = await service.processWebhook({ topic: 'payment', data: { id: '123' } }, 'ts=1,v1=whsec_test');
    expect(result).toEqual({ processed: true, topic: 'payment' });
  });

  it('propagates provider errors', async () => {
    const service = new PaymentsService(
      { getConfig: vi.fn().mockResolvedValue({ monetizationMode: 'both', subscriptionPeriodMode: 'both' }) } as never,
      { findById: vi.fn().mockResolvedValue({ _id: 'u1', email: 'user@test.com' }) } as never,
      { createOrder: vi.fn().mockResolvedValue({ _id: 'ord1' }) } as never,
      {} as never,
      {} as never,
      { createOneTimePayment: vi.fn().mockRejectedValue(new AppError('PAYMENT_PROVIDER_ERROR', 502, 'boom')) } as never
    );

    await expect(service.createOneTimePayment({ userId: 'u1', title: 'Plan', amount: 10, currency: 'ARS' })).rejects.toBeInstanceOf(AppError);
  });
});
