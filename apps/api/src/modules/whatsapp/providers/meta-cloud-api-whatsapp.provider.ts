import { env } from '../../../config/env.js';
import type { TemplateHeader, TemplateTextParameter, WhatsAppProvider, WhatsAppProviderInput, WhatsAppProviderResult } from './whatsapp-provider.js';

const buildHeaderParameter = (header: TemplateHeader): Record<string, unknown> | null => {
  if (!header) return null;
  if (header.type === 'image') {
    if (header.mediaId) return { type: 'image', image: { id: header.mediaId } };
    if (header.link) return { type: 'image', image: { link: header.link } };
    return null;
  }
  if (header.mediaId) return { type: 'document', document: { id: header.mediaId, filename: header.filename } };
  if (header.link) return { type: 'document', document: { link: header.link, filename: header.filename } };
  return null;
};

const legacyTextParameters = (params: string[] = []): TemplateTextParameter[] => params.map((text) => ({ type: 'text', text }));

export class MetaCloudApiWhatsAppProvider implements WhatsAppProvider {
  async sendTemplateMessage(input: WhatsAppProviderInput): Promise<WhatsAppProviderResult> {
    const accessToken = input.accessToken ?? env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = input.apiVersion ?? env.WHATSAPP_META_API_VERSION;
    if (!input.phoneNumberId) throw new Error('missing_meta_phone_number_id');
    if (!accessToken) throw new Error('missing_meta_access_token');

    const bodyParameters = input.parameters ?? legacyTextParameters(input.params);
    const components: Record<string, unknown>[] = [];
    const headerParameter = buildHeaderParameter(input.header ?? null);
    if (headerParameter) components.push({ type: 'header', parameters: [headerParameter] });
    if (bodyParameters.length > 0) components.push({ type: 'body', parameters: bodyParameters });

    const payload = {
      messaging_product: 'whatsapp',
      to: input.to,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        components
      }
    };

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${input.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`meta_cloud_api_error_${response.status}: ${JSON.stringify(body)}`);

    const messageId = Array.isArray(body.messages) ? body.messages[0]?.id : undefined;
    return { providerMessageId: messageId, raw: body, payloadPreview: { provider: 'meta_cloud_api', payload: { ...payload, to: input.to } } };
  }
}
