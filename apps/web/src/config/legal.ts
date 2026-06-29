export type LegalConfig = {
  operatorName: string;
  taxId: string | null;
  address: string;
  privacyContactEmail: string;
  supportEmail: string;
  hasRequiredProductionFields: boolean;
};

const sanitize = (value: unknown): string => String(value ?? '').replace(/[<>]/g, '').trim();
const optionalText = (value: unknown, fallback: string): string => sanitize(value) || fallback;
const isProduction = import.meta.env.PROD;

const requiredOperatorName = sanitize(import.meta.env.VITE_LEGAL_OPERATOR_NAME);
const requiredPrivacyEmail = sanitize(import.meta.env.VITE_PRIVACY_CONTACT_EMAIL);
const supportEmail = sanitize(import.meta.env.VITE_SUPPORT_EMAIL) || requiredPrivacyEmail || 'privacidad@nexmedturnos.pro';

export const legalConfig: LegalConfig = {
  operatorName: requiredOperatorName || 'Operador de NexMed pendiente de configuración',
  taxId: sanitize(import.meta.env.VITE_LEGAL_TAX_ID) || null,
  address: optionalText(import.meta.env.VITE_LEGAL_ADDRESS, 'Domicilio legal pendiente de configuración pública'),
  privacyContactEmail: requiredPrivacyEmail || supportEmail,
  supportEmail,
  hasRequiredProductionFields: Boolean(requiredOperatorName && requiredPrivacyEmail),
};

if (!isProduction && !legalConfig.hasRequiredProductionFields) {
  console.warn(
    'NexMed legal config: VITE_LEGAL_OPERATOR_NAME y VITE_PRIVACY_CONTACT_EMAIL son obligatorias para producción.'
  );
}
