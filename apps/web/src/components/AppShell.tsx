import type { ReactElement, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { resolveAvatarUrl } from '../lib/resolve-avatar-url';

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

const initialsFor = (firstName?: string, lastName?: string, email?: string): string => {
  const fullInitials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase();
  if (fullInitials) {
    return fullInitials;
  }
  return (email?.[0] ?? 'U').toUpperCase();
};

export const AppShell = ({ children }: { children: ReactNode }): ReactElement => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, memberships, activeOrganizationId, activeOrganizationSummary, clearSession } = useAuth();

  const membership = memberships.find((item) => item.organizationId === activeOrganizationId && item.status === 'active');
  const isSuperAdmin = user?.globalRole === 'super_admin';
  const isPatient = membership?.role === 'patient' || location.pathname.startsWith('/patient');
  const items = isSuperAdmin && location.pathname.startsWith('/admin') ? adminItems : isPatient ? patientItems : centerItems;
  const sectionTitle = isSuperAdmin && location.pathname.startsWith('/admin')
    ? 'Panel Super Admin'
    : isPatient
      ? 'Portal Paciente'
      : activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Centro';

  const avatarUrl = user?.avatar?.url ? resolveAvatarUrl(user.avatar.url) : null;

  return (
    <div className="nx-shell">
      <aside className="nx-sidebar">
        <div className="nx-brand">
          <h3>NexMed</h3>
          <p>{sectionTitle}</p>
        </div>
        <nav className="nx-nav">
          {items.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} to={item.to} className={`nx-nav-link${active ? ' is-active' : ''}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="nx-main">
        <header className="nx-topbar">
          <p className="nx-topbar__title">{sectionTitle}</p>
          <div className="nx-user">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar de usuario" className="nx-avatar" />
            ) : (
              <span className="nx-avatar nx-avatar--fallback">{initialsFor(user?.firstName, user?.lastName, user?.email)}</span>
            )}
            <div className="nx-user__meta">
              <div className="nx-user__name">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario'}</div>
              <div className="nx-user__email">{user?.email ?? 'Sin email'}</div>
            </div>
            <button
              type="button"
              className="nx-btn-danger"
              onClick={async () => {
                await clearSession();
                navigate('/login', { replace: true });
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <div>{children}</div>
      </div>
    </div>
  );
};
