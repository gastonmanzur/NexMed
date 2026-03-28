import type { OrganizationMemberRole, OrganizationMemberStatus } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';

interface DashboardModule {
  key: string;
  title: string;
  description: string;
  path: string;
}

const MODULES: DashboardModule[] = [
  {
    key: 'professionals',
    title: 'Profesionales',
    description: 'Gestioná altas, edición, estados y especialidades asociadas.',
    path: '/app/professionals'
  },
  {
    key: 'specialties',
    title: 'Especialidades',
    description: 'Administrá el catálogo de servicios y su estado operativo.',
    path: '/app/specialties'
  },
  {
    key: 'schedule',
    title: 'Agenda',
    description: 'Configurá agenda base, bloqueos y disponibilidad por profesional.',
    path: '/app/professionals'
  },
  {
    key: 'appointments',
    title: 'Turnos',
    description: 'Próximamente: administración de turnos y estados.',
    path: ''
  }
];

const canManageByRole = (role: OrganizationMemberRole | undefined, status: OrganizationMemberStatus | undefined): boolean =>
  status === 'active' && (role === 'owner' || role === 'admin');

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

  const canManage = canManageByRole(activeMembership?.role, activeMembership?.status);

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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/organization/profile">Editar perfil del centro</Link>
          <Link to="/app/professionals">Ir a profesionales</Link>
          <Link to="/app/specialties">Ir a especialidades</Link>
        </div>
        {!canManage ? <p style={{ color: '#555' }}>Tenés acceso de lectura para módulos operativos.</p> : null}
      </Card>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {MODULES.map((module) => (
          <Card key={module.key} title={module.title}>
            <p>{module.description}</p>
            {module.path ? <Link to={module.path}>Abrir módulo</Link> : <p style={{ color: '#666' }}>Disponible en una próxima etapa.</p>}
          </Card>
        ))}
      </section>
    </main>
  );
};
