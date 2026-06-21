export type TemplateHeader =
  | {
      type: 'image';
      link?: string;
      mediaId?: string;
    }
  | {
      type: 'document';
      link?: string;
      mediaId?: string;
      filename?: string;
    }
  | null;

export interface TemplateTextParameter {
  type: 'text';
  parameter_name?: string;
  text: string;
}

export interface WhatsAppProviderInput {
  organizationId: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  header?: TemplateHeader;
  parameters?: TemplateTextParameter[];
  params?: string[];
  accessToken?: string | undefined;
  apiVersion?: string | undefined;
}

export interface WhatsAppProviderResult {
  providerMessageId?: string;
  payloadPreview?: Record<string, unknown>;
  raw?: unknown;
}

export interface WhatsAppProvider {
  sendTemplateMessage(input: WhatsAppProviderInput): Promise<WhatsAppProviderResult>;
}
