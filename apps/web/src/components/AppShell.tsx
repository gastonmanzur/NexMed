import type { ReactElement, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useNotifications } from '../features/notifications/NotificationsContext';
import { resolveAvatarUrl } from '../lib/resolve-avatar-url';

interface NavItem {
  id: string;
  label: string;
  to: string;
}

const centerItems: NavItem[] = [
  { id: 'center-dashboard', label: 'Dashboard', to: '/app' },
  { id: 'center-professionals', label: 'Profesionales', to: '/app/professionals' },
  { id: 'center-specialties', label: 'Especialidades', to: '/app/specialties' },
  { id: 'center-agenda', label: 'Agenda', to: '/app/professionals' },
  { id: 'center-appointments', label: 'Turnos', to: '/app/appointments' },
  { id: 'center-invite', label: 'Invitación', to: '/app/invite' },
  { id: 'center-subscription', label: 'Suscripción', to: '/app/subscription' },
  { id: 'center-settings', label: 'Configuración', to: '/organization/profile' }
];

const patientItems: NavItem[] = [
  { id: 'patient-organizations', label: 'Mis centros', to: '/patient/organizations' },
  { id: 'patient-book', label: 'Reservar turno', to: '/patient/book' },
  { id: 'patient-appointments', label: 'Mis turnos', to: '/patient/appointments' },
  { id: 'patient-waitlist', label: 'Waitlist', to: '/patient/waitlist' },
  { id: 'patient-notifications', label: 'Notificaciones', to: '/patient/notifications' },
  { id: 'patient-profile', label: 'Perfil', to: '/patient/profile' }
];

const adminItems: NavItem[] = [
  { id: 'admin-summary', label: 'Resumen global', to: '/admin' },
  { id: 'admin-organizations', label: 'Organizaciones', to: '/admin/organizations' },
  { id: 'admin-feedback', label: 'Feedback', to: '/admin/feedback' },
  { id: 'admin-control', label: 'Control global', to: '/admin/control' }
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
  const { unreadCount, loadingUnread } = useNotifications();

  const membership = memberships.find(
    (item) => item.organizationId === activeOrganizationId && item.status === 'active'
  );

  const isSuperAdmin = user?.globalRole === 'super_admin';
  const isPatient = membership?.role === 'patient' || location.pathname.startsWith('/patient');
  const notificationsPath = isPatient ? '/patient/notifications' : '/app/notifications';
  const canUseNotifications = !isSuperAdmin;

  const items =
    isSuperAdmin && location.pathname.startsWith('/admin')
      ? adminItems
      : isPatient
        ? patientItems
        : centerItems;

  const sectionTitle =
    isSuperAdmin && location.pathname.startsWith('/admin')
      ? 'Panel Super Admin'
      : isPatient
        ? 'Portal Paciente'
        : activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Centro';

  const personalAvatarUrl = user?.avatar?.url ? resolveAvatarUrl(user.avatar.url) : null;
  const organizationLogoUrl = activeOrganizationSummary?.logoUrl
    ? resolveAvatarUrl(activeOrganizationSummary.logoUrl)
    : null;
  const isGoogleAuth = user?.provider === 'google';
  const shouldUseOrganizationLogo = !isPatient && !isSuperAdmin && !isGoogleAuth;

  const navbarAvatarUrl = isGoogleAuth
    ? personalAvatarUrl
    : shouldUseOrganizationLogo
      ? (organizationLogoUrl ?? personalAvatarUrl)
      : personalAvatarUrl;

  return (
    <div className="nx-shell">
      <aside className="nx-sidebar">
        <div className="nx-brand">
          <h3>NexMed</h3>
          <p>{sectionTitle}</p>
        </div>

        <nav className="nx-nav">
          {items.map((item) => {
            const active =
              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.id}
                to={item.to}
                className={`nx-nav-link${active ? ' is-active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="nx-main">
        <header className="nx-topbar">
          <p className="nx-topbar__title">{sectionTitle}</p>

          <div className="nx-topbar__actions">
            {canUseNotifications ? (
              <button
                type="button"
                className={`nx-bell-button${unreadCount > 0 ? ' has-unread' : ''}`}
                aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
                title="Ver notificaciones"
                disabled={loadingUnread}
                onClick={() => navigate(notificationsPath)}
              >
                <svg
                  className="nx-bell-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M14.5 18a2.5 2.5 0 0 1-5 0m8-6.5V10a5.5 5.5 0 1 0-11 0v1.5c0 1.2-.4 2.4-1.2 3.3L4 16h16l-1.3-1.2a4.8 4.8 0 0 1-1.2-3.3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {unreadCount > 0 ? (
                  <span className="nx-bell-badge" aria-hidden="true">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            <div className="nx-user">
              {navbarAvatarUrl ? (
                <img src={navbarAvatarUrl} alt="Avatar de usuario" className="nx-avatar" />
              ) : (
                <span className="nx-avatar nx-avatar--fallback">
                  {initialsFor(user?.firstName, user?.lastName, user?.email)}
                </span>
              )}

              <div className="nx-user__meta">
                <div className="nx-user__name">
                  {`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario'}
                </div>
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
          </div>
        </header>

        <div>{children}</div>
      </div>
    </div>
  );
};
