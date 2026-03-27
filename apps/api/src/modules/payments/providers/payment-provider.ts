export interface CreateOneTimePaymentInput {
  externalReference: string;
  title: string;
  amount: number;
  currency: string;
  payerEmail?: string;
}

export interface CreateSubscriptionInput {
  externalReference: string;
  reason: string;
  amount: number;
  currency: string;
  payerEmail: string;
  frequency: number;
  frequencyType: 'months' | 'years';
}

export interface ProviderCheckoutResponse {
  providerOrderId: string;
  preferenceId?: string;
  initPoint: string;
}

export interface ProviderPaymentStatus {
  providerPaymentId: string;
  externalReference: string;
  status: string;
  statusDetail?: string;
  amount: number;
  currency: string;
  methodType?: string;
  rawPayload?: unknown;
}

export interface ProviderSubscriptionStatus {
  providerPreapprovalId: string;
  externalReference: string;
  status: string;
  nextBillingDate?: string;
  rawPayload?: unknown;
}

export interface PaymentProvider {
  createOneTimePayment(input: CreateOneTimePaymentInput): Promise<ProviderCheckoutResponse>;
  createSubscription(input: CreateSubscriptionInput): Promise<ProviderCheckoutResponse>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
  getPaymentStatusByExternalReference(externalReference: string): Promise<ProviderPaymentStatus | null>;
  getSubscriptionStatus(providerPreapprovalId: string): Promise<ProviderSubscriptionStatus>;
}
