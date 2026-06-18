import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
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

  return (
    <div className="professional-shell">
      <aside className="professional-sidebar">
        <div className="professional-brand">
          <span className="professional-brand__mark">N</span>
          <div>
            <strong>NexMed Pro</strong>
            <small>{activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Centro actual'}</small>
          </div>
        </div>
        <nav className="professional-nav" aria-label="Panel profesional">
          <NavLink to="/app/professional" end className={() => location.pathname === '/app/professional' || location.pathname.startsWith('/app/professional/appointments') ? 'active' : undefined}>Agenda del día</NavLink>
          <NavLink to="/app/professional/patients">Pacientes</NavLink>
          <NavLink to="/app/professional/clinical-history">Historia clínica</NavLink>
          <NavLink to="/app/professional/messages">Mensajes</NavLink>
          <NavLink to="/app/professional/profile">Perfil</NavLink>
        </nav>
      </aside>
      <main className="professional-main">
        <header className="professional-topbar">
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
