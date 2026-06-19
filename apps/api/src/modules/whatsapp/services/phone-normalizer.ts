export const normalizeWhatsAppPhone = (input?: string | null, defaultCountry: 'AR' = 'AR'): string | null => {
  if (defaultCountry !== 'AR') return null;
  const normalized = normalizeArgentinaWhatsAppPhone(input);
  return normalized.ok ? normalized.normalized : null;
};

export const normalizeArgentinaWhatsAppPhone = (value?: string | null): { ok: true; normalized: string } | { ok: false; error: string } => {
  const raw = value?.trim();
  if (!raw) return { ok: false, error: 'missing_patient_phone' };
  let digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return { ok: false, error: 'invalid_patient_phone_empty' };

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('549')) return isValid(digits) ? { ok: true, normalized: digits } : { ok: false, error: 'invalid_argentina_phone_length' };
  if (digits.startsWith('54')) {
    const national = digits.slice(2).replace(/^0+/, '');
    const mobile = national.startsWith('9') ? national : `9${national.replace(/^15/, '')}`;
    return isValid(`54${mobile}`) ? { ok: true, normalized: `54${mobile}` } : { ok: false, error: 'invalid_argentina_phone_length' };
  }
  if (digits.startsWith('0')) digits = digits.slice(1);
  const parts = digits.startsWith('15') && digits.length >= 10 ? digits.slice(2) : digits.replace(/^(.{2,4})15/, '$1');
  const normalized = `549${parts}`;
  return isValid(normalized) ? { ok: true, normalized } : { ok: false, error: 'invalid_argentina_phone_length' };
};

const isValid = (digits: string): boolean => /^549\d{8,12}$/.test(digits);
