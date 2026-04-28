import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

interface FormState {
  name: string;
  displayName: string;
  type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  description: string;
  timezone: string;
  locale: string;
  currency: string;
}

export const OrganizationOnboardingPage = (): ReactElement => {
  const navigate = useNavigate();
  const { accessToken, activeOrganizationId, organizations, memberships, setOrganizationsContext } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: '',
    displayName: '',
    type: 'clinic',
    contactEmail: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    description: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    locale: 'es-AR',
    currency: 'ARS'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );

  const canEdit = activeMembership ? ['owner', 'admin'].includes(activeMembership.role) : false;
  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations]
  );

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) {
      return;
    }

    void (async () => {
      try {
        setError(null);
        setLoading(true);
        const profile = await organizationApi.getProfile(accessToken, activeOrganizationId);

        setForm({
          name: profile.organization.name,
          displayName: profile.organization.displayName ?? '',
          type: profile.organization.type,
          contactEmail: profile.organization.contactEmail ?? '',
          phone: profile.organization.phone ?? '',
          address: profile.organization.address ?? '',
          city: profile.organization.city ?? '',
          country: profile.organization.country ?? '',
          description: profile.organization.description ?? '',
          timezone: profile.settings?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
          locale: profile.settings?.locale ?? 'es-AR',
          currency: profile.settings?.currency ?? 'ARS'
        });

        const shouldSyncContext =
          !activeOrganization ||
          activeOrganization.name !== profile.organization.name ||
          activeOrganization.displayName !== profile.organization.displayName ||
          activeOrganization.type !== profile.organization.type ||
          activeOrganization.contactEmail !== profile.organization.contactEmail ||
          activeOrganization.phone !== profile.organization.phone ||
          activeOrganization.address !== profile.organization.address ||
          activeOrganization.city !== profile.organization.city ||
          activeOrganization.country !== profile.organization.country ||
          activeOrganization.description !== profile.organization.description ||
          activeOrganization.status !== profile.organization.status ||
          activeOrganization.onboardingCompleted !== profile.organization.onboardingCompleted;

        if (shouldSyncContext) {
          setOrganizationsContext({
            organizations: organizations.map((organization) =>
              organization.id === profile.organization.id ? profile.organization : organization
            ),
            memberships,
            activeOrganizationId
          });
        }

        if (profile.onboarding.onboardingCompleted) {
          navigate('/app', { replace: true });
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, activeOrganization, activeOrganizationId, memberships, navigate, organizations, setOrganizationsContext]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  if (!canEdit) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <main className="nx-page nx-org-onboarding-flow">
      <Card
        title="Revisión final del centro"
        subtitle="Verificá y completá la información institucional antes de continuar."
        className="nx-org-onboarding-flow__card nx-org-onboarding-review"
      >
        {loading ? <p className="nx-org-profile__status">Cargando datos actuales...</p> : null}
        {error ? <p className="nx-entity-form-page__error">{error}</p> : null}

        <div className="nx-org-onboarding-flow__section">
          <h3 className="nx-org-onboarding-flow__section-title">Identidad del centro</h3>
          <div className="nx-form-grid nx-org-onboarding-flow__grid">
            <label className="nx-field">
              <span>Nombre del centro</span>
              <input placeholder="Nombre del centro" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label className="nx-field">
              <span>Nombre comercial</span>
              <input
                placeholder="(opcional)"
                value={form.displayName}
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </label>
            <label className="nx-field">
              <span>Tipo de organización</span>
              <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FormState['type'] }))}>
                <option value="clinic">Clínica</option>
                <option value="office">Consultorio</option>
                <option value="esthetic_center">Centro de estética</option>
                <option value="professional_cabinet">Gabinete profesional</option>
                <option value="other">Otro</option>
              </select>
            </label>
          </div>
        </div>

        <div className="nx-org-onboarding-flow__section">
          <h3 className="nx-org-onboarding-flow__section-title">Contacto y ubicación</h3>
          <div className="nx-form-grid nx-org-onboarding-flow__grid">
            <label className="nx-field">
              <span>Email de contacto</span>
              <input
                placeholder="Opcional si hay teléfono"
                value={form.contactEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
              />
            </label>
            <label className="nx-field">
              <span>Teléfono</span>
              <input
                placeholder="Opcional si hay email"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
            <label className="nx-field">
              <span>Dirección</span>
              <input placeholder="Dirección" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
            </label>
            <label className="nx-field">
              <span>Ciudad</span>
              <input placeholder="Ciudad" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
            </label>
            <label className="nx-field">
              <span>País</span>
              <input placeholder="País" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
            </label>
            <label className="nx-field nx-form-grid__full">
              <span>Descripción breve</span>
              <textarea
                placeholder="Contá brevemente servicios, especialidades o enfoque del centro"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="nx-org-onboarding-flow__section">
          <h3 className="nx-org-onboarding-flow__section-title">Configuración general</h3>
          <div className="nx-form-grid nx-org-onboarding-flow__grid">
            <label className="nx-field">
              <span>Timezone</span>
              <input placeholder="Timezone" value={form.timezone} onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} />
            </label>
            <label className="nx-field">
              <span>Locale</span>
              <input placeholder="Locale" value={form.locale} onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))} />
            </label>
            <label className="nx-field">
              <span>Moneda</span>
              <input placeholder="Moneda" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
            </label>
          </div>
        </div>

        <section className="nx-org-onboarding-review__summary">
          <h3 className="nx-org-onboarding-flow__section-title">Resumen para confirmar</h3>
          <dl className="nx-org-onboarding-review__summary-grid">
            <div><dt>Nombre</dt><dd>{form.name || '—'}</dd></div>
            <div><dt>Tipo</dt><dd>{form.type}</dd></div>
            <div><dt>Email</dt><dd>{form.contactEmail || '—'}</dd></div>
            <div><dt>Teléfono</dt><dd>{form.phone || '—'}</dd></div>
            <div><dt>Ubicación</dt><dd>{[form.city, form.country].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Moneda / locale</dt><dd>{`${form.currency || '—'} · ${form.locale || '—'}`}</dd></div>
          </dl>
        </section>

        <div className="nx-form-actions nx-org-onboarding-flow__actions nx-org-onboarding-flow__actions--end">
          <button
            className="nx-btn"
            type="button"
            disabled={saving || loading}
            onClick={async () => {
              if (!accessToken || !activeOrganizationId) {
                return;
              }

              try {
                setSaving(true);
                setError(null);

                const profile = await organizationApi.updateProfile(accessToken, activeOrganizationId, {
                  name: form.name,
                  type: form.type,
                  city: form.city,
                  country: form.country,
                  timezone: form.timezone,
                  ...(form.displayName.trim() ? { displayName: form.displayName.trim() } : {}),
                  ...(form.contactEmail.trim() ? { contactEmail: form.contactEmail.trim() } : {}),
                  ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
                  ...(form.address.trim() ? { address: form.address.trim() } : {}),
                  ...(form.description.trim() ? { description: form.description.trim() } : {}),
                  ...(form.locale.trim() ? { locale: form.locale.trim() } : {}),
                  ...(form.currency.trim() ? { currency: form.currency.trim() } : {})
                });

                setOrganizationsContext({
                  organizations: organizations.map((organization) =>
                    organization.id === profile.organization.id ? profile.organization : organization
                  ),
                  memberships,
                  activeOrganizationId
                });

                if (profile.onboarding.onboardingCompleted) {
                  navigate('/app', { replace: true });
                }
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Guardando...' : 'Confirmar y continuar'}
          </button>
        </div>
      </Card>
    </main>
  );
};
