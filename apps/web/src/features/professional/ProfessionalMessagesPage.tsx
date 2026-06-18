import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { InternalMessageDto } from '../organizations/organization-api';
import { InternalMessageDetailModal } from '../organizations/InternalMessagesCard';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useAuth } from '../auth/AuthContext';
import { professionalApi } from './professional-api';

export const ProfessionalMessagesPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [messages, setMessages] = useState<InternalMessageDto[]>([]);
  const [selected, setSelected] = useState<InternalMessageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    try {
      setMessages(await professionalApi.messages(accessToken, activeOrganizationId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes profesionales');
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeOrganizationId]);

  useEffect(() => { void load(); }, [load]);

  const mark = async (messageId: string, action: 'read' | 'resolve'): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    if (action === 'read') await professionalApi.markMessageRead(accessToken, activeOrganizationId, messageId);
    else await professionalApi.resolveMessage(accessToken, activeOrganizationId, messageId);
    await load();
  };

  if (loading) return <LoadingState message="Cargando mensajes internos..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="professional-dashboard">
      <div className="pro-hero">
        <div>
          <span>Comunicación interna</span>
          <h1>Mensajes</h1>
          <p>Bandeja de mensajes recibidos de secretaría, respuestas y estados de seguimiento.</p>
        </div>
        <div className="pro-hero__status">{messages.filter((message) => message.status === 'unread').length} no leídos</div>
      </div>

      <section className="pro-panel pro-panel--messages">
        <header className="pro-section-header"><div><span>Bandeja profesional</span><h2>Mensajes de secretaría</h2></div><span>{messages.length} mensajes</span></header>
        {messages.length ? messages.map((message) => {
          const messageId = message._id ?? message.id ?? '';
          return (
            <article key={messageId} className={message.status === 'unread' ? 'pro-message pro-message--unread' : 'pro-message'}>
              <div className="pro-message__content">
                <b className={message.status === 'unread' ? 'pro-status pro-status--arrived' : 'pro-status'}>{message.status === 'unread' ? 'No leído' : message.status === 'resolved' ? 'Resuelto' : 'Leído'}</b>
                <p>{message.message}</p>
              </div>
              <div className="pro-message__actions">
                <button className="pro-button pro-button--ghost" type="button" onClick={() => setSelected(message)}>Ver detalle</button>
                {message.status === 'unread' ? <button className="pro-button pro-button--ghost" type="button" onClick={() => void mark(messageId, 'read')}>Marcar leído</button> : null}
                {message.status !== 'resolved' ? <button className="pro-button pro-button--secondary" type="button" onClick={() => void mark(messageId, 'resolve')}>Resolver</button> : null}
              </div>
            </article>
          );
        }) : <div className="pro-empty"><strong>No hay mensajes internos pendientes.</strong><p>Las novedades de secretaría aparecerán acá.</p></div>}
      </section>

      {selected && accessToken && activeOrganizationId ? (
        <InternalMessageDetailModal
          accessToken={accessToken}
          organizationId={activeOrganizationId}
          message={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { void load(); }}
          onMarkRead={(messageId) => professionalApi.markMessageRead(accessToken, activeOrganizationId, messageId)}
          onResolve={(messageId) => professionalApi.resolveMessage(accessToken, activeOrganizationId, messageId)}
        />
      ) : null}
    </section>
  );
};
