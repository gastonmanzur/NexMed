import type { ReactElement, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

interface NavItem {
  label: string;
  to: string;
}

const centerItems: NavItem[] = [
  { label: 'Dashboard', to: '/app' },
  { label: 'Profesionales', to: '/app/professionals' },
  { label: 'Especialidades', to: '/app/specialties' },
  { label: 'Agenda', to: '/app/professionals' },
  { label: 'Turnos', to: '/app/appointments' },
  { label: 'Invitación', to: '/app/invite' },
  { label: 'Suscripción', to: '/app/subscription' },
  { label: 'Configuración', to: '/organization/profile' }
];

const patientItems: NavItem[] = [
  { label: 'Mis centros', to: '/patient/organizations' },
  { label: 'Reservar turno', to: '/patient/organizations' },
  { label: 'Mis turnos', to: '/patient/appointments' },
  { label: 'Waitlist', to: '/patient/waitlist' },
  { label: 'Notificaciones', to: '/patient/notifications' },
  { label: 'Perfil', to: '/patient/profile' }
];

const adminItems: NavItem[] = [
  { label: 'Resumen global', to: '/admin' },
  { label: 'Organizaciones', to: '/admin/organizations' },
  { label: 'Feedback', to: '/admin' },
  { label: 'Control global', to: '/admin' }
];

export const AppShell = ({ children }: { children: ReactNode }): ReactElement => {
  const location = useLocation();
  const { user, memberships, activeOrganizationId, activeOrganizationSummary } = useAuth();

  const membership = memberships.find((item) => item.organizationId === activeOrganizationId && item.status === 'active');
  const isSuperAdmin = user?.globalRole === 'super_admin';
  const isPatient = membership?.role === 'patient' || location.pathname.startsWith('/patient');
  const items = isSuperAdmin && location.pathname.startsWith('/admin') ? adminItems : isPatient ? patientItems : centerItems;

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <aside style={{ borderRight: '1px solid #e6e6e6', padding: '1rem', background: '#fafafa' }}>
        <h3 style={{ marginTop: 0 }}>NexMed</h3>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          {isSuperAdmin && location.pathname.startsWith('/admin')
            ? 'Panel Super Admin'
            : isPatient
              ? 'Portal Paciente'
              : activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Centro'}
        </p>
        <nav style={{ display: 'grid', gap: '0.4rem' }}>
          {items.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} to={item.to} style={{ fontWeight: active ? 700 : 500 }}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
};
