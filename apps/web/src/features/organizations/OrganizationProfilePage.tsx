import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';
import { resolveAvatarUrl } from '../../lib/resolve-avatar-url';

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

const containerStyle = { maxWidth: 860, margin: '2rem auto', padding: '1rem' };

const emptyForm = (): FormState => ({
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

const buildFormFromOrganization = (organization: NonNullable<ReturnType<typeof useAuth>['organizations'][number]>): FormState => ({
  name: organization.name,
  displayName: organization.displayName ?? '',
  type: organization.type,
  contactEmail: organization.contactEmail ?? '',
  phone: organization.phone ?? '',
  address: organization.address ?? '',
  city: organization.city ?? '',
  country: organization.country ?? '',
  description: organization.description ?? '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale: 'es-AR',
  currency: 'ARS'
});

export const OrganizationProfilePage = (): ReactElement => {
  const { accessToken, activeOrganizationId, organizations, memberships, setOrganizationsContext, onboardingCompleted } = useAuth();

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations]
  );

  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    if (!activeOrganization) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      ...buildFormFromOrganization(activeOrganization)
    }));
    setLogoLoadFailed(false);
  }, [activeOrganization]);

  const logoUrl = !logoLoadFailed && activeOrganization?.logoUrl ? resolveAvatarUrl(activeOrganization.logoUrl) : null;

  const canEdit = activeMembership ? ['owner', 'admin'].includes(activeMembership.role) : false;

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
          activeOrganization.logoUrl !== profile.organization.logoUrl ||
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
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, activeOrganization, activeOrganizationId, memberships, organizations, setOrganizationsContext]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  if (!activeOrganization) {
    return (
      <main style={containerStyle}>
        <Card title="Perfil del centro">
          <p>Cargando organización activa...</p>
        </Card>
      </main>
    );
  }

  if (!canEdit) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <main style={containerStyle}>
      <Card title="Perfil del centro" subtitle="Editá el perfil institucional y la configuración general básica.">
        <div className="nx-org-profile">

          {loading ? <p className="nx-org-profile__status">Cargando datos actuales...</p> : null}
          {error ? <p className="nx-org-profile__status nx-org-profile__status--error">{error}</p> : null}
          {feedback ? <p className="nx-org-profile__status nx-org-profile__status--success">{feedback}</p> : null}

          <section className="nx-org-profile__section nx-org-profile__section--logo">
            <div className="nx-org-profile__section-header">
              <h3>Logo institucional</h3>
              <p>Este logo es independiente de la foto de perfil del usuario.</p>
            </div>
            <div className="nx-org-profile__logo-row">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo del centro"
                  className="nx-org-profile__logo-preview"
                  onError={() => setLogoLoadFailed(true)}
                />
              ) : (
                <div className="nx-org-profile__logo-empty">
                  Sin logo
                </div>
              )}
              <div className="nx-org-profile__logo-actions">
                <label className="nx-btn-secondary" style={{ cursor: logoBusy ? 'not-allowed' : 'pointer' }}>
                  {logoBusy ? 'Procesando...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={logoBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = '';
                      if (!file || !accessToken || !activeOrganizationId) {
                        return;
                      }

                      void (async () => {
                        try {
                          setError(null);
                          setFeedback(null);
                          setLogoBusy(true);
                          const profile = await organizationApi.uploadLogo(accessToken, activeOrganizationId, file);
                          setOrganizationsContext({
                            organizations: organizations.map((organization) =>
                              organization.id === profile.organization.id ? profile.organization : organization
                            ),
                            memberships,
                            activeOrganizationId
                          });
                          setLogoLoadFailed(false);
                          setFeedback('Logo institucional actualizado.');
                        } catch (cause) {
                          setError((cause as Error).message);
                        } finally {
                          setLogoBusy(false);
                        }
                      })();
                    }}
                  />
                </label>
                {logoUrl ? (
                  <button
                    type="button"
                    className="nx-btn-danger"
                    disabled={logoBusy}
                    onClick={() => {
                      if (!accessToken || !activeOrganizationId) {
                        return;
                      }

                      void (async () => {
                        try {
                          setError(null);
                          setFeedback(null);
                          setLogoBusy(true);
                          const profile = await organizationApi.deleteLogo(accessToken, activeOrganizationId);
                          setOrganizationsContext({
                            organizations: organizations.map((organization) =>
                              organization.id === profile.organization.id ? profile.organization : organization
                            ),
                            memberships,
                            activeOrganizationId
                          });
                          setLogoLoadFailed(false);
                          setFeedback('Logo institucional eliminado.');
                        } catch (cause) {
                          setError((cause as Error).message);
                        } finally {
                          setLogoBusy(false);
                        }
                      })();
                    }}
                  >
                    Quitar logo
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="nx-org-profile__section">
            <div className="nx-org-profile__section-header">
              <h3>Identidad del centro</h3>
              <p>Datos institucionales que verán tus pacientes y equipo.</p>
            </div>
            <div className="nx-form-grid nx-org-profile__grid nx-org-profile__grid--two">
              <label className="nx-field">
                Nombre del centro
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="nx-field">
                Nombre comercial
                <input
                  value={form.displayName}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                />
              </label>
              <label className="nx-field">
                Tipo de organización
                <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FormState['type'] }))}>
                  <option value="clinic">Clínica</option>
                  <option value="office">Consultorio</option>
                  <option value="esthetic_center">Centro de estética</option>
                  <option value="professional_cabinet">Gabinete profesional</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="nx-field nx-org-profile__field--full">
                Descripción breve
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                />
              </label>
            </div>
          </section>

          <section className="nx-org-profile__section">
            <div className="nx-org-profile__section-header">
              <h3>Contacto y ubicación</h3>
              <p>Información útil para comunicación y presencia del centro.</p>
            </div>
            <div className="nx-form-grid nx-org-profile__grid nx-org-profile__grid--two">
              <label className="nx-field">
                Email de contacto
                <input value={form.contactEmail} onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} />
              </label>
              <label className="nx-field">
                Teléfono
                <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </label>
              <label className="nx-field">
                Dirección
                <input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
              </label>
              <label className="nx-field">
                Ciudad
                <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
              </label>
              <label className="nx-field">
                País
                <input value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
              </label>
            </div>
          </section>

          <section className="nx-org-profile__section">
            <div className="nx-org-profile__section-header">
              <h3>Configuración general</h3>
              <p>Parámetros regionales para la operación diaria.</p>
            </div>
            <div className="nx-form-grid nx-org-profile__grid nx-org-profile__grid--three">
              <label className="nx-field">
                Timezone
                <input value={form.timezone} onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))} />
              </label>
              <label className="nx-field">
                Locale
                <input value={form.locale} onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))} />
              </label>
              <label className="nx-field">
                Moneda
                <input value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
              </label>
            </div>
          </section>

          <div className="nx-org-profile__actions">

          <button
            type="button"
            className="nx-btn"
            disabled={saving || loading}
            onClick={async () => {
              if (!accessToken || !activeOrganizationId) {
                return;
              }

              try {
                setSaving(true);
                setError(null);
                setFeedback(null);

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
                setFeedback('Perfil actualizado correctamente.');
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          </div>
        </div>
      </Card>
    </main>
  );
};
