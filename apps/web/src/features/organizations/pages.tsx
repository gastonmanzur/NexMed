import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

const containerStyle = { maxWidth: 640, margin: '2rem auto', padding: '1rem' };

export const OnboardingPage = (): ReactElement => {
  const { user, organizations } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (organizations.length > 0) {
    return <Navigate to="/post-login" replace />;
  }

  return (
    <main style={containerStyle}>
      <Card title="Bienvenido a NexMed">
        <p>Tu cuenta está activa, pero todavía no tenés una organización.</p>
        <p>Creá tu primera organización para comenzar.</p>
        <a href="/organizations/new">Crear mi organización</a>
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
    <main style={containerStyle}>
      <Card title="Crear organización">
        <input placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
          <option value="clinic">Clínica</option>
          <option value="office">Consultorio</option>
          <option value="esthetic_center">Centro de estética</option>
          <option value="professional_cabinet">Gabinete profesional</option>
          <option value="other">Otro</option>
        </select>
        <input placeholder="Email de contacto (opcional)" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
        <input placeholder="Teléfono (opcional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <input placeholder="Dirección (opcional)" value={address} onChange={(event) => setAddress(event.target.value)} />
        <input placeholder="Ciudad (opcional)" value={city} onChange={(event) => setCity(event.target.value)} />
        <input placeholder="País (opcional)" value={country} onChange={(event) => setCountry(event.target.value)} />

        <button
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

              navigate('/app');
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Creando...' : 'Crear organización'}
        </button>

        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
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
    <main style={containerStyle}>
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
            navigate('/app');
          }}
        >
          Continuar
        </button>
      </Card>
    </main>
  );
};

export const AppPlaceholderPage = (): ReactElement => {
  const navigate = useNavigate();
  const { user, organizations, memberships, activeOrganizationId, clearSession } = useAuth();

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations]
  );

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  return (
    <main style={containerStyle}>
      <Card title="App (placeholder protegido)">
        <p>
          Usuario: {user.firstName} {user.lastName} ({user.email})
        </p>
        <p>Global role: {user.globalRole}</p>
        <p>Organización activa: {activeOrganization?.name ?? activeOrganizationId}</p>
        <p>Rol en organización: {activeMembership?.role ?? 'N/A'}</p>

        <button
          type="button"
          onClick={async () => {
            await clearSession();
            navigate('/login');
          }}
        >
          Logout
        </button>
      </Card>
    </main>
  );
};
