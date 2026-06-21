import { env } from '../../../config/env.js';

export type MetaTemplateHeaderFormat = 'IMAGE' | 'DOCUMENT' | 'TEXT' | 'VIDEO' | 'LOCATION' | null;

export interface MetaWhatsAppTemplateDetails {
  id?: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components: unknown[];
  headerFormat: MetaTemplateHeaderFormat;
  bodyParameterNames: string[];
}

export class WhatsAppConfigurationError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'WhatsAppConfigurationError';
  }
}

const readComponents = (template: any): unknown[] => Array.isArray(template?.components) ? template.components : [];
const findHeaderFormat = (components: unknown[]): MetaTemplateHeaderFormat => {
  const header = components.find((component: any) => component?.type === 'HEADER') as any;
  return header?.format ?? null;
};
const findBodyParameterNames = (components: unknown[]): string[] => {
  const body = components.find((component: any) => component?.type === 'BODY') as any;
  const exampleNames = body?.example?.body_text_named_params;
  if (Array.isArray(exampleNames)) return exampleNames.map((item: any) => String(item?.param_name ?? item?.parameter_name ?? '')).filter(Boolean);
  const text = typeof body?.text === 'string' ? body.text : '';
  return Array.from(text.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) as Iterable<RegExpMatchArray>, (match) => match[1] ?? '').filter(Boolean);
};

export class MetaWhatsAppTemplateService {
  async findApprovedTemplate(input: { name: string; language: string; accessToken?: string; apiVersion?: string; wabaId?: string }): Promise<MetaWhatsAppTemplateDetails> {
    const accessToken = input.accessToken ?? env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = input.apiVersion ?? env.WHATSAPP_META_API_VERSION;
    const wabaId = input.wabaId ?? env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    if (!accessToken) throw new WhatsAppConfigurationError('META_WHATSAPP_GLOBAL_PROVIDER_NOT_CONFIGURED', 'Falta configurar el access token de Meta.');
    if (!wabaId) throw new WhatsAppConfigurationError('META_WHATSAPP_WABA_ID_REQUIRED', 'Falta configurar el WABA ID de Meta.');

    const url = new URL(`https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`);
    url.searchParams.set('fields', 'id,name,language,status,category,components');
    url.searchParams.set('limit', '250');
    url.searchParams.set('name', input.name);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new WhatsAppConfigurationError('META_TEMPLATE_LOOKUP_FAILED', 'No se pudieron consultar las plantillas de Meta.', body);

    const template = (Array.isArray(body.data) ? body.data : []).find((item: any) => item?.name === input.name && item?.language === input.language && item?.status === 'APPROVED');
    if (!template) throw new WhatsAppConfigurationError('TEMPLATE_NOT_FOUND_FOR_LANGUAGE', `La plantilla ${input.name} no existe o no está aprobada para ${input.language}.`, { templateName: input.name, templateLanguage: input.language });

    const components = readComponents(template);
    return { id: template.id, name: template.name, language: template.language, status: template.status, category: template.category, components, headerFormat: findHeaderFormat(components), bodyParameterNames: findBodyParameterNames(components) };
  }
}
