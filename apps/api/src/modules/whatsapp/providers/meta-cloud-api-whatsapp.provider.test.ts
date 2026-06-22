import { describe, expect, it, vi } from 'vitest';
import { MetaCloudApiWhatsAppProvider } from './meta-cloud-api-whatsapp.provider.js';

describe('MetaCloudApiWhatsAppProvider', () => {
  it('builds template payload with image header and named body parameters', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ messages: [{ id: 'wamid.test' }] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const expectedUrl = 'https://www.nexmedturnos.pro/assets/whatsapp/nexmed-header.jpg';

    await new MetaCloudApiWhatsAppProvider().sendTemplateMessage({
      organizationId: 'org_1',
      phoneNumberId: '123',
      to: '5491122626516',
      templateName: 'appointment_confirmation',
      languageCode: 'es_AR',
      accessToken: 'token',
      apiVersion: 'v22.0',
      header: { type: 'image', link: expectedUrl },
      parameters: [
        { type: 'text', parameter_name: 'patient_name', text: 'Gastón' },
        { type: 'text', parameter_name: 'center_name', text: 'Estética Méndez' },
        { type: 'text', parameter_name: 'appointment_date', text: '25/06/2026' },
        { type: 'text', parameter_name: 'appointment_time', text: '10:30' },
        { type: 'text', parameter_name: 'professional_name', text: 'Dra. Vanesa Medina' }
      ]
    });

    const firstCall = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    const payload = JSON.parse(firstCall[1].body);
    expect(payload.template.components[0].type).toBe('header');
    expect(payload.template.components[0].parameters[0].type).toBe('image');
    expect(payload.template.components[0].parameters[0].image.link).toBe(expectedUrl);
    expect(payload.template.components[1].parameters.map((parameter: { parameter_name: string }) => parameter.parameter_name)).toEqual([
      'patient_name',
      'center_name',
      'appointment_date',
      'appointment_time',
      'professional_name'
    ]);
  });
});
