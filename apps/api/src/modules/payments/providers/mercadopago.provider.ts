import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';
import type {
  CreateOneTimePaymentInput,
  CreateSubscriptionInput,
  PaymentProvider,
  ProviderCheckoutResponse,
  ProviderPaymentStatus,
  ProviderSubscriptionStatus
} from './payment-provider.js';

export class MercadoPagoProvider implements PaymentProvider {
  private readonly apiBaseUrl = env.MERCADOPAGO_API_BASE_URL;

  private get headers() {
    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new AppError('PAYMENT_PROVIDER_NOT_CONFIGURED', 500, 'Mercado Pago access token is not configured');
    }

    return {
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  async createOneTimePayment(input: CreateOneTimePaymentInput): Promise<ProviderCheckoutResponse> {
    if (
      !env.MERCADOPAGO_CHECKOUT_SUCCESS_URL ||
      !env.MERCADOPAGO_CHECKOUT_FAILURE_URL ||
      !env.MERCADOPAGO_CHECKOUT_PENDING_URL
    ) {
      throw new AppError(
        'PAYMENT_PROVIDER_NOT_CONFIGURED',
        500,
        'Mercado Pago checkout back URLs are not configured'
      );
    }

    const requestBody = {
      external_reference: input.externalReference,
      items: [
        {
          title: input.title,
          quantity: 1,
          unit_price: input.amount,
          currency_id: input.currency
        }
      ],
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      back_urls: {
        success: env.MERCADOPAGO_CHECKOUT_SUCCESS_URL,
        failure: env.MERCADOPAGO_CHECKOUT_FAILURE_URL,
        pending: env.MERCADOPAGO_CHECKOUT_PENDING_URL
      },
      auto_return: 'approved' as const,
      statement_descriptor: env.MERCADOPAGO_STATEMENT_DESCRIPTOR
    };

    console.log('MP create preference request body =>', requestBody);
    console.log('MP access token loaded =>', Boolean(env.MERCADOPAGO_ACCESS_TOKEN));
    console.log('MP access token prefix =>', env.MERCADOPAGO_ACCESS_TOKEN?.slice(0, 12));

    let response: globalThis.Response;

    try {
      response = await fetch(`${this.apiBaseUrl}/checkout/preferences`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });
    } catch (error) {
      console.error('MP fetch error =>', error);
      throw new AppError('PAYMENT_PROVIDER_ERROR', 502, `Mercado Pago request failed before response: ${String(error)}`);
    }

    const rawText = await response.text();
    console.log('MP create preference status =>', response.status);
    console.log('MP create preference raw response =>', rawText);

    let payload: { id?: string; init_point?: string; sandbox_init_point?: string } = {};
    try {
      payload = JSON.parse(rawText);
    } catch {
      // dejar payload vacío
    }

    if (!response.ok || !payload.id || (!payload.init_point && !payload.sandbox_init_point)) {
      throw new AppError(
        'PAYMENT_PROVIDER_ERROR',
        502,
        `Failed to create Mercado Pago checkout preference. Status: ${response.status}. Response: ${rawText}`
      );
    }

    return {
      providerOrderId: payload.id,
      preferenceId: payload.id,
      initPoint: payload.init_point ?? payload.sandbox_init_point!
    };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderCheckoutResponse> {
    const response = await fetch(`${this.apiBaseUrl}/preapproval`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        auto_recurring: {
          frequency: input.frequency,
          frequency_type: input.frequencyType,
          transaction_amount: input.amount,
          currency_id: input.currency
        },
        back_url: env.MERCADOPAGO_CHECKOUT_SUCCESS_URL,
        status: 'pending'
      })
    });

    const payload = (await response.json()) as { id?: string; init_point?: string };
    if (!response.ok || !payload.id || !payload.init_point) {
      throw new AppError('PAYMENT_PROVIDER_ERROR', 502, 'Failed to create Mercado Pago preapproval');
    }

    return {
      providerOrderId: payload.id,
      initPoint: payload.init_point
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    const response = await fetch(`${this.apiBaseUrl}/v1/payments/${providerPaymentId}`, {
      method: 'GET',
      headers: this.headers
    });

    const payload = (await response.json()) as {
      id: number;
      external_reference: string;
      status: string;
      status_detail?: string;
      transaction_amount: number;
      currency_id: string;
      payment_type_id?: string;
    };

    if (!response.ok || !payload.external_reference) {
      throw new AppError('PAYMENT_PROVIDER_ERROR', 502, 'Failed to fetch Mercado Pago payment status');
    }

    return {
      providerPaymentId: String(payload.id),
      externalReference: payload.external_reference,
      status: payload.status,
      amount: payload.transaction_amount,
      currency: payload.currency_id,
      ...(payload.status_detail ? { statusDetail: payload.status_detail } : {}),
      ...(payload.payment_type_id ? { methodType: payload.payment_type_id } : {}),
      rawPayload: payload
    };
  }

  async getPaymentStatusByExternalReference(externalReference: string): Promise<ProviderPaymentStatus | null> {
    const query = new URLSearchParams({
      external_reference: externalReference,
      sort: 'date_created',
      criteria: 'desc',
      limit: '1'
    });

    const response = await fetch(`${this.apiBaseUrl}/v1/payments/search?${query.toString()}`, {
      method: 'GET',
      headers: this.headers
    });

    const payload = (await response.json()) as {
      results?: Array<{
        id: number;
        external_reference?: string;
        status: string;
        status_detail?: string;
        transaction_amount: number;
        currency_id: string;
        payment_type_id?: string;
      }>;
    };

    if (!response.ok) {
      throw new AppError('PAYMENT_PROVIDER_ERROR', 502, 'Failed to search Mercado Pago payment by external reference');
    }

    const match = payload.results?.find((result) => result.external_reference === externalReference);
    if (!match) {
      return null;
    }

    return {
      providerPaymentId: String(match.id),
      externalReference,
      status: match.status,
      amount: match.transaction_amount,
      currency: match.currency_id,
      ...(match.status_detail ? { statusDetail: match.status_detail } : {}),
      ...(match.payment_type_id ? { methodType: match.payment_type_id } : {}),
      rawPayload: match
    };
  }

  async getSubscriptionStatus(providerPreapprovalId: string): Promise<ProviderSubscriptionStatus> {
    const response = await fetch(`${this.apiBaseUrl}/preapproval/${providerPreapprovalId}`, {
      method: 'GET',
      headers: this.headers
    });

    const payload = (await response.json()) as {
      id: string;
      external_reference: string;
      status: string;
      next_payment_date?: string;
    };

    if (!response.ok || !payload.external_reference) {
      throw new AppError('PAYMENT_PROVIDER_ERROR', 502, 'Failed to fetch Mercado Pago subscription status');
    }

    return {
      providerPreapprovalId: payload.id,
      externalReference: payload.external_reference,
      status: payload.status,
      ...(payload.next_payment_date ? { nextBillingDate: payload.next_payment_date } : {}),
      rawPayload: payload
    };
  }
}