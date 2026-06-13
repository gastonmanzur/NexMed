import type { WhatsAppProvider, WhatsAppProviderInput, WhatsAppProviderResult } from './whatsapp-provider.js';

export class ManualWhatsAppProvider implements WhatsAppProvider {
  async sendTemplateMessage(input: WhatsAppProviderInput): Promise<WhatsAppProviderResult> {
    return { payloadPreview: { provider: 'manual', input } };
  }
}
