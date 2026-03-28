import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';

const MODULES = [
  { key: 'professionals', title: 'Profesionales', description: 'Próximamente: gestión de profesionales y roles clínicos.' },
  { key: 'specialties', title: 'Especialidades', description: 'Próximamente: catálogo de especialidades del centro.' },
  { key: 'schedule', title: 'Agenda', description: 'Próximamente: configuración de agenda y horarios.' },
  { key: 'appointments', title: 'Turnos', description: 'Próximamente: administración de turnos y estados.' }
];

export const DashboardPage = (): ReactElement => {
  const { user, activeOrganizationId, organizations, memberships, onboardingCompleted } = useAuth();

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

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  return (
    <main style={{ maxWidth: 980, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <Card title="Dashboard del centro">
        <p>
          <strong>Centro:</strong> {activeOrganization?.displayName ?? activeOrganization?.name ?? '-'}
        </p>
        <p>
          <strong>Tipo:</strong> {activeOrganization?.type ?? '-'}
        </p>
        <p>
          <strong>Contacto:</strong> {activeOrganization?.contactEmail ?? activeOrganization?.phone ?? '-'}
        </p>
        <p>
          <strong>Ubicación:</strong> {activeOrganization?.city ?? '-'}, {activeOrganization?.country ?? '-'}
        </p>
        <p>
          <strong>Estado:</strong> {activeOrganization?.status ?? '-'} / onboarding {onboardingCompleted ? 'completo' : 'pendiente'}
        </p>
        <p>
          <strong>Tu rol:</strong> {activeMembership?.role ?? '-'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/organization/profile">Editar perfil del centro</Link>
        </div>
      </Card>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {MODULES.map((module) => (
          <Card key={module.key} title={module.title}>
            <p>{module.description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
};
