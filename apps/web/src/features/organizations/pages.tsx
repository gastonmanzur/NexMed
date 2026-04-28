import type { ReactElement } from 'react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

export const OnboardingPage = (): ReactElement => {
  const { user, organizations } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (organizations.length > 0) {
    return <Navigate to="/post-login" replace />;
  }

  return (
    <main className="nx-page nx-org-onboarding-flow">
      <Card title="Bienvenido a NexMed" className="nx-org-onboarding-flow__card">
        <p className="nx-org-onboarding-flow__lead">Tu cuenta está activa, pero todavía no tenés una organización.</p>
        <p className="nx-org-onboarding-flow__lead">Creá tu primera organización para comenzar.</p>
        <a className="nx-btn nx-org-onboarding-flow__primary-link" href="/organizations/new">Crear mi organización</a>
      </Card>
    </main>
  );
};

export const CreateOrganizationPage = (): ReactElement => {
  const navigate = useNavigate();
  const { accessToken, organizations, memberships, setOrganizationsContext } = useAuth();

  const [name, setName] = useState('');
  const [type, setType] = useState<'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other'>('clinic');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="nx-page nx-org-onboarding-flow">
      <Card title="Crear organización" subtitle="Completá los datos iniciales de tu centro para comenzar el alta." className="nx-org-onboarding-flow__card">
        <div className="nx-org-onboarding-flow__section">
          <h3 className="nx-org-onboarding-flow__section-title">Datos del centro</h3>
          <div className="nx-form-grid nx-org-onboarding-flow__grid">
            <label className="nx-field">
              <span>Nombre</span>
              <input placeholder="Ej: Centro Médico Norte" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="nx-field">
              <span>Tipo de organización</span>
              <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
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
              <input placeholder="opcional@centro.com" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
            </label>
            <label className="nx-field">
              <span>Teléfono</span>
              <input placeholder="(opcional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="nx-field">
              <span>Dirección</span>
              <input placeholder="(opcional)" value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
            <label className="nx-field">
              <span>Ciudad</span>
              <input placeholder="(opcional)" value={city} onChange={(event) => setCity(event.target.value)} />
            </label>
            <label className="nx-field">
              <span>País</span>
              <input placeholder="(opcional)" value={country} onChange={(event) => setCountry(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="nx-form-actions nx-org-onboarding-flow__actions">
          <button
            className="nx-btn"
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                setError('');
                setLoading(true);

                const result = await organizationApi.create(accessToken, {
                  name,
                  type,
                  ...(contactEmail.trim() ? { contactEmail } : {}),
                  ...(phone.trim() ? { phone } : {}),
                  ...(address.trim() ? { address } : {}),
                  ...(city.trim() ? { city } : {}),
                  ...(country.trim() ? { country } : {})
                });

                setOrganizationsContext({
                  organizations: [...organizations, result.organization],
                  memberships: [...memberships, result.membership],
                  activeOrganizationId: result.organization.id
                });

                navigate('/onboarding/organization');
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Creando...' : 'Continuar'}
          </button>
        </div>

        {error ? <p className="nx-entity-form-page__error">{error}</p> : null}
      </Card>
    </main>
  );
};

export const SelectOrganizationPage = (): ReactElement => {
  const navigate = useNavigate();
  const { organizations, activeOrganizationId, setActiveOrganizationId, user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (organizations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const selectedOrganizationId = activeOrganizationId ?? organizations[0]?.id ?? null;

  return (
    <main className="nx-page nx-org-onboarding-flow">
      <Card title="Seleccionar organización">
        <p>Tu cuenta pertenece a múltiples organizaciones.</p>
        <select
          value={selectedOrganizationId ?? ''}
          onChange={(event) => {
            setActiveOrganizationId(event.target.value || null);
          }}
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            navigate('/post-login');
          }}
        >
          Continuar
        </button>
      </Card>
    </main>
  );
};
