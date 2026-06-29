import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { privacyPolicyMetadata } from './legal-metadata';

const root = resolve(__dirname, '../../..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('public privacy policy', () => {
  it('registers public routes without ProtectedRoute', () => {
    const app = read('src/app/App.tsx');
    expect(app).toContain('path="/privacy-policy" element={<PrivacyPolicyPage />}');
    expect(app).toContain('path="/politica-de-privacidad" element={<PrivacyPolicyPage />}');
    expect(app).not.toMatch(/path="\/privacy-policy"[\s\S]{0,120}ProtectedRoute/);
  });

  it('contains title, data deletion link, configured email fallback and no private API calls', () => {
    const page = read('src/features/home/PrivacyPolicyPage.tsx');
    const legal = read('src/config/legal.ts');
    expect(page).toContain('Política de Privacidad de NexMed');
    expect(page).toContain('to="/data-deletion"');
    expect(legal).toContain('privacidad@nexmedturnos.pro');
    expect(page).not.toContain('/api/');
    expect(page).not.toContain('undefined');
  });

  it('documents canonical metadata', () => {
    expect(privacyPolicyMetadata.title).toBe('Política de Privacidad | NexMed');
    expect(privacyPolicyMetadata.description).toContain('Política de Privacidad de NexMed');
    expect(privacyPolicyMetadata.canonicalUrl).toBe('https://www.nexmedturnos.pro/privacy-policy');
    expect(privacyPolicyMetadata.robots).toBe('index, follow');
  });

  it('links the privacy policy from footer, login, register and data deletion pages', () => {
    expect(read('src/features/home/HomePage.tsx')).toContain('to="/privacy-policy"');
    expect(read('src/features/auth/pages.tsx')).toContain('to="/privacy-policy"');
    expect(read('src/features/home/DataDeletionPage.tsx')).toContain('to="/privacy-policy"');
  });

  it('supports direct reload behind nginx through SPA build routes', () => {
    const main = read('src/main.tsx');
    expect(main).toContain('BrowserRouter');
  });
});
