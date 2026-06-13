import type { WhatsAppProvider, WhatsAppProviderInput, WhatsAppProviderResult } from './whatsapp-provider.js';

export class NoopWhatsAppProvider implements WhatsAppProvider {
  async sendTemplateMessage(input: WhatsAppProviderInput): Promise<WhatsAppProviderResult> {
    return { providerMessageId: `noop_${Date.now()}`, payloadPreview: { provider: 'noop', input } };
  }
}
