import type { ReactElement } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { formatArgentinaDate, formatArgentinaTime } from '../../lib/argentina-date-time';
import { organizationApi, type InternalMessageDto } from './organization-api';

const typeLabel: Record<string, string> = {
  call_patient: 'Pedir paciente',
  delay_notice: 'Demora',
  admin_request: 'Dato administrativo',
  documentation_request: 'Documentación',
  payment_request: 'Cobro',
  patient_arrived: 'Paciente llegó',
  patient_left: 'Paciente se retiró',
  coverage_issue: 'Cobertura',
  custom: 'Personalizado',
  reply: 'Respuesta'
};

const statusLabel: Record<string, string> = { unread: 'No leído', read: 'Leído', resolved: 'Resuelto' };

const personName = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '—';
  const item = value as { firstName?: string; lastName?: string; displayName?: string };
  return item.displayName ?? (`${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || '—');
};

export const InternalMessagesCard = ({
  accessToken,
  organizationId,
  messages,
  loading,
  error,
  onRefresh,
  allowReply = false
}: {
  accessToken: string;
  organizationId: string;
  messages: InternalMessageDto[];
  loading?: boolean;
  error?: string;
  onRefresh: () => void | Promise<void>;
  allowReply?: boolean;
}): ReactElement => {
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const sendReply = async (messageId: string): Promise<void> => {
    const text = (replyById[messageId] ?? '').trim();
    if (!text) return;
    await organizationApi.replyInternalMessage(accessToken, organizationId, messageId, text);
    setReplyById((current) => ({ ...current, [messageId]: '' }));
    await onRefresh();
  };

  const update = async (messageId: string, action: 'read' | 'resolve'): Promise<void> => {
    if (action === 'read') await organizationApi.markInternalMessageRead(accessToken, organizationId, messageId);
    else await organizationApi.resolveInternalMessage(accessToken, organizationId, messageId);
    await onRefresh();
  };

  return <Card title="Mensajes internos" subtitle="Comunicación operativa enviada por profesionales.">
    {loading ? <p>Cargando mensajes...</p> : null}
    {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    {!loading && !error && messages.length === 0 ? <p>No hay mensajes internos pendientes para mostrar.</p> : null}
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {messages.map((message) => (
        <article key={message._id ?? message.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '0.85rem', display: 'grid', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <strong>{message.title || 'Nuevo mensaje del profesional'}</strong>
            <span className="nx-badge">{statusLabel[message.status] ?? message.status}</span>
          </div>
          <p><b>Profesional:</b> {personName(message.professionalId)}</p>
          <p><b>Paciente:</b> {personName(message.patientProfileId)}</p>
          <p><b>Tipo:</b> {typeLabel[message.type] ?? message.type}</p>
          <p><b>Mensaje:</b> {message.message}</p>
          <p style={{ color: 'var(--text-soft)' }}>{formatArgentinaDate(message.createdAt)} {formatArgentinaTime(message.createdAt)} {message.appointmentId ? <>· <Link to={`/app/appointments/${typeof message.appointmentId === 'string' ? message.appointmentId : message.appointmentId._id}`}>Ver turno</Link></> : null}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="nx-btn-secondary" disabled={message.status !== 'unread'} onClick={() => void update(message._id ?? message.id, 'read')}>Marcar leído</button>
            <button type="button" className="nx-btn-secondary" disabled={message.status === 'resolved'} onClick={() => void update(message._id ?? message.id, 'resolve')}>Resolver</button>
          </div>
          {allowReply && message.fromRole !== 'secretary' ? <div style={{ display: 'grid', gap: '.4rem' }}>
            <textarea placeholder="Responder al profesional" value={replyById[message._id ?? message.id ?? ''] ?? ''} onChange={(event) => setReplyById((current) => ({ ...current, [message._id ?? message.id ?? '']: event.target.value }))} />
            <button type="button" className="nx-btn-primary" disabled={!(replyById[message._id ?? message.id ?? ''] ?? '').trim()} onClick={() => void sendReply(message._id ?? message.id)}>Responder</button>
          </div> : null}
        </article>
      ))}
    </div>
  </Card>;
};
