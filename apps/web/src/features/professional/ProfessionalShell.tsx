import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { InternalMessageDto } from '../organizations/organization-api';
import { InternalMessageDetailModal, InternalMessagePopup } from '../organizations/InternalMessagesCard';
import { professionalApi } from './professional-api';
import './professional.css';

export const ProfessionalShell = ({ children }: { children: ReactNode }): ReactElement => {
  const { accessToken, activeOrganizationId, activeOrganizationSummary, user } = useAuth();
  const location = useLocation();
  const [internalMessagePopup, setInternalMessagePopup] = useState<InternalMessageDto | null>(null);
  const [internalMessageDetail, setInternalMessageDetail] = useState<InternalMessageDto | null>(null);
  const [markingInternalRead, setMarkingInternalRead] = useState(false);
  const [internalMessagesRefreshKey, setInternalMessagesRefreshKey] = useState(0);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) {
      setInternalMessagePopup(null);
      return;
    }

    const notifiedKey = `nexmed:notifiedProfessionalInternalMessages:${activeOrganizationId}`;
    const readNotifiedIds = (): string[] => {
      try {
        const parsed = JSON.parse(window.sessionStorage.getItem(notifiedKey) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
      } catch {
        return [];
      }
    };
    const rememberNotifiedId = (id: string): void => {
      const next = Array.from(new Set([...readNotifiedIds(), id]));
      window.sessionStorage.setItem(notifiedKey, JSON.stringify(next));
    };

    const pollInternalMessages = async (): Promise<void> => {
      try {
        const messages = await professionalApi.messages(accessToken, activeOrganizationId);
        const notifiedIds = new Set(readNotifiedIds());
        const nextMessage = messages.find((message: InternalMessageDto) => {
          const id = message._id ?? message.id;
          return Boolean(id) && !notifiedIds.has(id ?? '') && message.toRole === 'professional' && message.status === 'unread';
        });
        if (nextMessage) {
          rememberNotifiedId(nextMessage._id ?? nextMessage.id ?? '');
          setInternalMessagePopup(nextMessage);
        }
      } catch {
        // El polling de mensajes internos no debe interrumpir la navegación del panel profesional.
      }
    };

    void pollInternalMessages();
    const interval = window.setInterval(() => { void pollInternalMessages(); }, 12000);
    return () => window.clearInterval(interval);
  }, [accessToken, activeOrganizationId, internalMessagesRefreshKey]);


  useEffect(() => {
    if (!isMobileNavOpen) return undefined;

    const onDocumentClick = (event: MouseEvent): void => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setIsMobileNavOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsMobileNavOpen(false);
    };

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileNavOpen]);

  const markInternalPopupRead = async (message: InternalMessageDto): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setMarkingInternalRead(true);
    try {
      await professionalApi.markMessageRead(accessToken, activeOrganizationId, message._id ?? message.id ?? '');
      setInternalMessagePopup(null);
      setInternalMessagesRefreshKey((current) => current + 1);
    } finally {
      setMarkingInternalRead(false);
    }
  };

  const professionalNavItems = [
    { label: 'Agenda del día', to: '/app/professional', matches: location.pathname === '/app/professional' || location.pathname.startsWith('/app/professional/appointments') },
    { label: 'Pacientes', to: '/app/professional/patients' },
    { label: 'Historia clínica', to: '/app/professional/clinical-history' },
    { label: 'Mensajes', to: '/app/professional/messages' },
    { label: 'Perfil', to: '/app/professional/profile' },
  ];

  const renderProfessionalNav = (className: string, onNavigate?: () => void): ReactElement[] =>
    professionalNavItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/app/professional'}
        className={({ isActive }) => `${className}${item.matches || isActive ? ' is-active' : ''}`}
        onClick={onNavigate}
      >
        <span className="nx-nav-link__dot" aria-hidden="true" />
        {item.label}
      </NavLink>
    ));

  return (
    <div className="professional-shell nx-shell">
      <aside className="professional-sidebar nx-sidebar">
        <div className="professional-brand nx-brand">
          <span className="professional-brand__mark nx-brand__pill">N</span>
          <div>
            <h3>NexMed Pro</h3>
            <p>{activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Centro actual'}</p>
          </div>
        </div>
        <nav className="professional-nav nx-nav" aria-label="Panel profesional">
          {renderProfessionalNav('professional-nav__link nx-nav-link')}
        </nav>
      </aside>
      <main className="professional-main nx-main">
        <header className="professional-topbar nx-topbar">
          <div className="nx-mobile-nav" ref={mobileNavRef}>
            <button
              type="button"
              className={`nx-mobile-nav-toggle${isMobileNavOpen ? ' is-open' : ''}`}
              aria-label="Abrir menú profesional"
              aria-expanded={isMobileNavOpen}
              aria-controls="professional-mobile-nav-panel"
              onClick={() => setIsMobileNavOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>
            {isMobileNavOpen ? (
              <nav id="professional-mobile-nav-panel" className="nx-mobile-nav__panel" aria-label="Menú profesional">
                {renderProfessionalNav('nx-mobile-nav__item', () => setIsMobileNavOpen(false))}
              </nav>
            ) : null}
          </div>
          <div>
            <span>Centro actual</span>
            <strong>{activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Sin centro seleccionado'}</strong>
          </div>
          <div>
            <span>Profesional</span>
            <strong>{user ? `${user.firstName} ${user.lastName}` : 'Profesional'}</strong>
          </div>
          <div>
            <span>Fecha</span>
            <strong>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(new Date())}</strong>
          </div>
        </header>
        {children}
      </main>

      {internalMessagePopup ? (
        <InternalMessagePopup
          message={internalMessagePopup}
          currentRole="professional"
          markingRead={markingInternalRead}
          onViewMessage={() => { setInternalMessageDetail(internalMessagePopup); setInternalMessagePopup(null); }}
          onMarkRead={() => void markInternalPopupRead(internalMessagePopup)}
          onClose={() => setInternalMessagePopup(null)}
        />
      ) : null}

      {internalMessageDetail && accessToken && activeOrganizationId ? (
        <InternalMessageDetailModal
          accessToken={accessToken}
          organizationId={activeOrganizationId}
          message={internalMessageDetail}
          onClose={() => setInternalMessageDetail(null)}
          onRefresh={() => { setInternalMessagesRefreshKey((current) => current + 1); }}
          onMarkRead={(messageId) => professionalApi.markMessageRead(accessToken, activeOrganizationId, messageId)}
          onResolve={(messageId) => professionalApi.resolveMessage(accessToken, activeOrganizationId, messageId)}
        />
      ) : null}
    </div>
  );
};
