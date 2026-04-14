import type { ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NotificationDto } from '@starter/shared-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useNotifications } from '../features/notifications/NotificationsContext';
import { patientApi } from '../features/patient/patient-api';
import { resolveAvatarUrl } from '../lib/resolve-avatar-url';

interface NavItem {
  id: string;
  label: string;
  to: string;
}

const centerItems: NavItem[] = [
  { id: 'center-dashboard', label: 'Inicio', to: '/app' },
  { id: 'center-professionals', label: 'Profesionales', to: '/app/professionals' },
  { id: 'center-specialties', label: 'Especialidades', to: '/app/specialties' },
  { id: 'center-appointments', label: 'Agenda', to: '/app/appointments' },
  { id: 'center-invite', label: 'Invitación', to: '/app/invite' },
  { id: 'center-subscription', label: 'Suscripción', to: '/app/subscription' },
  { id: 'center-settings', label: 'Configuración', to: '/organization/profile' }
];

const patientItems: NavItem[] = [
  { id: 'patient-organizations', label: 'Mis centros', to: '/patient/organizations' },
  // { id: 'patient-book', label: 'Reservar turno', to: '/patient/book' },
  { id: 'patient-appointments', label: 'Mis turnos', to: '/patient/appointments' },
  { id: 'patient-family-members', label: 'Familiares', to: '/patient/family-members' },
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

const notificationTypeLabel = (item: NotificationDto): string => {
  switch (item.type) {
    case 'appointment_booked':
      return 'Turno confirmado';
    case 'appointment_canceled':
      return 'Turno cancelado';
    case 'appointment_rescheduled':
      return 'Turno reprogramado';
    case 'appointment_reminder':
      return 'Recordatorio';
    case 'availability_alert':
      return 'Disponibilidad';
    default:
      return 'Novedad';
  }
};

const notificationTypeIcon = (item: NotificationDto): string => {
  switch (item.type) {
    case 'appointment_booked':
      return '✅';
    case 'appointment_canceled':
      return '❌';
    case 'appointment_rescheduled':
      return '🔄';
    case 'appointment_reminder':
      return '⏰';
    case 'availability_alert':
      return '📣';
    default:
      return '🔔';
  }
};

const relativeTime = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.max(Math.floor(diffMs / 1000), 0);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return new Date(isoDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

export const AppShell = ({ children }: { children: ReactNode }): ReactElement => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, memberships, activeOrganizationId, activeOrganizationSummary, clearSession, accessToken } =
    useAuth();
  const { unreadCount, loadingUnread, refreshUnreadCount, markOneAsReadLocally, markManyAsReadLocally } =
    useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationDto[]>([]);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const [loadingMarkAll, setLoadingMarkAll] = useState(false);
  const [dropdownError, setDropdownError] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const membership = memberships.find(
    (item) => item.organizationId === activeOrganizationId && item.status === 'active'
  );

  const isSuperAdmin = user?.globalRole === 'super_admin';
  const isPatient = membership?.role === 'patient' || location.pathname.startsWith('/patient');
  const notificationsPath = isPatient ? '/patient/notifications' : '/app/notifications';
  const canUseNotifications = !isSuperAdmin;
  const sortedTopNotifications = useMemo(
    () =>
      [...notificationItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [notificationItems]
  );
  const hasUnreadInDropdown = sortedTopNotifications.some((item) => !item.readAt);

  const closeNotifications = () => {
    setIsNotificationsOpen(false);
  };

  const openNotifications = async () => {
    if (!accessToken) {
      return;
    }
    setIsNotificationsOpen(true);
    setLoadingDropdown(true);
    setDropdownError('');
    try {
      const rows = await patientApi.listNotifications(accessToken);
      setNotificationItems(rows);
    } catch (cause) {
      setDropdownError((cause as Error).message);
      setNotificationItems([]);
    } finally {
      setLoadingDropdown(false);
    }
  };

  const onBellClick = () => {
    if (isNotificationsOpen) {
      closeNotifications();
      return;
    }
    void openNotifications();
  };

  const markOneAsReadAndOpen = async (item: NotificationDto) => {
    if (!accessToken) {
      return;
    }
    if (!item.readAt) {
      try {
        await patientApi.markNotificationRead(accessToken, item.id);
        setNotificationItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: new Date().toISOString(), status: 'read' } : entry
          )
        );
        markOneAsReadLocally();
      } catch {
        await refreshUnreadCount();
      }
    }
    closeNotifications();
    navigate(notificationsPath);
  };

  const markAllAsRead = async () => {
    if (!accessToken || loadingMarkAll) {
      return;
    }
    const unreadItems = sortedTopNotifications.filter((item) => !item.readAt);
    if (unreadItems.length === 0) {
      return;
    }

    setLoadingMarkAll(true);
    try {
      await Promise.all(unreadItems.map((item) => patientApi.markNotificationRead(accessToken, item.id)));
      const now = new Date().toISOString();
      setNotificationItems((current) =>
        current.map((item) => (!item.readAt ? { ...item, readAt: now, status: 'read' } : item))
      );
      markManyAsReadLocally(unreadItems.length);
    } catch {
      await refreshUnreadCount();
    } finally {
      setLoadingMarkAll(false);
    }
  };

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isNotificationsOpen]);

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
          <span className="nx-brand__pill">N</span>
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
                <span className="nx-nav-link__dot" aria-hidden="true" />
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
              <div className="nx-notifications" ref={dropdownRef}>
                <button
                  type="button"
                  className={`nx-bell-button${unreadCount > 0 ? ' has-unread' : ''}`}
                  aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
                  title="Ver notificaciones"
                  disabled={loadingUnread}
                  onClick={onBellClick}
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
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                {isNotificationsOpen ? (
                  <div className="nx-notifications-dropdown" role="dialog" aria-label="Notificaciones">
                    <div className="nx-notifications-header">
                      <h4>Notificaciones</h4>
                      {hasUnreadInDropdown ? (
                        <button type="button" onClick={() => void markAllAsRead()} disabled={loadingMarkAll}>
                          Marcar todas como leídas
                        </button>
                      ) : null}
                    </div>

                    <div className="nx-notifications-body">
                      {loadingDropdown ? (
                        <div className="nx-notification-skeleton-list" aria-hidden="true">
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} className="nx-notification-skeleton-row">
                              <span className="nx-notification-skeleton-icon" />
                              <div className="nx-notification-skeleton-text">
                                <span />
                                <span />
                                <span />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {!loadingDropdown && dropdownError ? (
                        <p className="nx-notifications-inline-error">{dropdownError}</p>
                      ) : null}

                      {!loadingDropdown && !dropdownError && sortedTopNotifications.length === 0 ? (
                        <div className="nx-notifications-empty">
                          <span aria-hidden="true">🔔</span>
                          <h5>No tenés notificaciones nuevas</h5>
                          <p>Cuando haya novedades importantes, las vas a ver acá.</p>
                        </div>
                      ) : null}

                      {!loadingDropdown && !dropdownError
                        ? sortedTopNotifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`nx-notification-item${item.readAt ? '' : ' is-unread'}`}
                              onClick={() => void markOneAsReadAndOpen(item)}
                            >
                              <div className="nx-notification-item__icon" aria-hidden="true">
                                {notificationTypeIcon(item)}
                              </div>
                              <div className="nx-notification-item__content">
                                <div className="nx-notification-item__topline">
                                  <strong>{item.title}</strong>
                                  <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                                </div>
                                <p>{item.message}</p>
                                <small>{notificationTypeLabel(item)}</small>
                              </div>
                            </button>
                          ))
                        : null}
                    </div>

                    <div className="nx-notifications-footer">
                      <button
                        type="button"
                        className="nx-notifications-view-all"
                        onClick={() => {
                          closeNotifications();
                          navigate(notificationsPath);
                        }}
                      >
                        Ver todas las notificaciones
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
                className="nx-btn-secondary nx-signout-btn"
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
