export const PRIVACY_POLICY_URL = 'https://www.nexmedturnos.pro/privacy-policy';

export const privacyPolicyMetadata = {
  title: 'Política de Privacidad | NexMed',
  description:
    'Política de Privacidad de NexMed para usuarios, organizaciones, profesionales y pacientes, incluyendo WhatsApp, Google/Firebase y Mercado Pago.',
  canonicalUrl: PRIVACY_POLICY_URL,
  robots: 'index, follow',
};

const upsertMeta = (selector: string, attr: 'name' | 'property', key: string, content: string): void => {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const meta = existing ?? document.createElement('meta');
  meta.setAttribute(attr, key);
  meta.content = content;
  if (!existing) document.head.appendChild(meta);
};

export const applyPrivacyPolicyMetadata = (): void => {
  document.title = privacyPolicyMetadata.title;
  upsertMeta('meta[name="description"]', 'name', 'description', privacyPolicyMetadata.description);
  upsertMeta('meta[name="robots"]', 'name', 'robots', privacyPolicyMetadata.robots);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', privacyPolicyMetadata.title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', privacyPolicyMetadata.description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', privacyPolicyMetadata.canonicalUrl);
  const existingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const canonical = existingCanonical ?? document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = privacyPolicyMetadata.canonicalUrl;
  if (!existingCanonical) document.head.appendChild(canonical);
};
