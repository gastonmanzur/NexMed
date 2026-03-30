import type { OrganizationMemberRole, OrganizationMemberStatus } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from '../organizations/organization-api';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';

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
    description: 'Gestión de turnos: creación, cancelación y reprogramación.',
    path: '/app/appointments'
  }
];

const canManageByRole = (role: OrganizationMemberRole | undefined, status: OrganizationMemberStatus | undefined): boolean =>
  status === 'active' && (role === 'owner' || role === 'admin');

export const DashboardPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId, organizations, memberships, onboardingCompleted } = useAuth();
  const [summary, setSummary] = useState<{
    generatedAt: string;
    appointmentsToday: number;
    appointmentsNext7Days: number;
    recentCancellations: number;
    activeProfessionals: number;
    linkedPatients: number;
    activeWaitlistRequests: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations]
  );

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );

  const canManage = canManageByRole(activeMembership?.role, activeMembership?.status);

  const loadSummary = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) {
      return;
    }

    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await organizationApi.getDashboardSummary(accessToken, activeOrganizationId);
      setSummary(data);
    } catch (cause) {
      setSummaryError((cause as Error).message);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeOrganizationId]);

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
          <Link to="/app/appointments">Ir a turnos</Link>
          <Link to="/feedback" state={{ fromPath: '/dashboard' }}>Enviar feedback beta</Link>
        </div>
        {!canManage ? <p style={{ color: '#555' }}>Tenés acceso de lectura para módulos operativos.</p> : null}
      </Card>

      <Card title="Resumen operativo">
        {summaryLoading ? <LoadingState message="Cargando métricas operativas..." /> : null}
        {!summaryLoading && summaryError ? <ErrorState message={summaryError} onRetry={() => void loadSummary()} /> : null}
        {!summaryLoading && !summaryError && !summary ? (
          <EmptyState
            title="Sin métricas disponibles"
            description="Todavía no pudimos construir el resumen operativo de este centro."
            action={<button type="button" onClick={() => void loadSummary()}>Reintentar</button>}
          />
        ) : null}
        {!summaryLoading && !summaryError && summary ? (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            <Card title="Turnos hoy">
              <p>{summary.appointmentsToday}</p>
            </Card>
            <Card title="Próx. 7 días">
              <p>{summary.appointmentsNext7Days}</p>
            </Card>
            <Card title="Cancelaciones (7d)">
              <p>{summary.recentCancellations}</p>
            </Card>
            <Card title="Profesionales activos">
              <p>{summary.activeProfessionals}</p>
            </Card>
            <Card title="Pacientes vinculados">
              <p>{summary.linkedPatients}</p>
            </Card>
            <Card title="Waitlist activas">
              <p>{summary.activeWaitlistRequests}</p>
            </Card>
          </section>
        ) : null}
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
