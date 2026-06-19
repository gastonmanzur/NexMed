import { env } from '../../../config/env.js';
import type { WhatsAppProvider, WhatsAppProviderInput, WhatsAppProviderResult } from './whatsapp-provider.js';

export class MetaCloudApiWhatsAppProvider implements WhatsAppProvider {
  async sendTemplateMessage(input: WhatsAppProviderInput): Promise<WhatsAppProviderResult> {
    const accessToken = input.accessToken ?? env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = input.apiVersion ?? env.WHATSAPP_META_API_VERSION;
    if (!input.phoneNumberId) throw new Error('missing_meta_phone_number_id');
    if (!accessToken) throw new Error('missing_meta_access_token');

    const payload = {
      messaging_product: 'whatsapp',
      to: input.to,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        components: input.params.length > 0 ? [{ type: 'body', parameters: input.params.map((text) => ({ type: 'text', text })) }] : []
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
