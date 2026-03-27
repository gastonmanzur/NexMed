export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushDeliveryResult {
  token: string;
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  shouldInvalidateToken: boolean;
}

export interface PushProvider {
  send(messages: PushMessage[]): Promise<PushDeliveryResult[]>;
}
