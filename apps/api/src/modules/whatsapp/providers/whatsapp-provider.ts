export interface WhatsAppProviderInput {
  organizationId: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  params: string[];
  accessToken?: string | undefined;
  apiVersion?: string | undefined;
}

export interface WhatsAppProviderResult {
  providerMessageId?: string;
  payloadPreview?: Record<string, unknown>;
}

export interface WhatsAppProvider {
  sendTemplateMessage(input: WhatsAppProviderInput): Promise<WhatsAppProviderResult>;
}
