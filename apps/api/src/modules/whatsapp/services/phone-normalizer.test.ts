import { describe, expect, it } from 'vitest';
import { normalizeArgentinaWhatsAppPhone } from './phone-normalizer.js';

describe('normalizeArgentinaWhatsAppPhone', () => {
  it('normalizes local Buenos Aires mobile numbers to WhatsApp international format', () => {
    expect(normalizeArgentinaWhatsAppPhone('11 5555-4444')).toEqual({ ok: true, normalized: '5491155554444' });
  });

  it('keeps already normalized Argentina WhatsApp numbers', () => {
    expect(normalizeArgentinaWhatsAppPhone('+54 9 11 5555-4444')).toEqual({ ok: true, normalized: '5491155554444' });
  });

  it('rejects empty phones with a clear error', () => {
    expect(normalizeArgentinaWhatsAppPhone('   ')).toEqual({ ok: false, error: 'missing_patient_phone' });
  });
});
