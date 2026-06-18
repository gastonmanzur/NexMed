import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { formatArgentinaDate, formatArgentinaTime } from '../../lib/argentina-date-time';
import { organizationApi, type InternalMessageDto } from './organization-api';

export const internalMessageTypeLabel: Record<string, string> = {
  call_patient: 'Pedir paciente',
  delay_notice: 'Aviso de demora',
  admin_request: 'Dato administrativo',
  documentation_request: 'Documentación',
  payment_request: 'Cobro',
  patient_arrived: 'Paciente llegó',
  patient_left: 'Paciente se retiró',
  coverage_issue: 'Obra social',
  custom: 'Personalizado',
  reply: 'Respuesta'
};

const typeIcon: Record<string, string> = {
  call_patient: '👤',
  delay_notice: '⏱️',
  admin_request: '📌',
  documentation_request: '📄',
  payment_request: '💳',
  patient_arrived: '✅',
  patient_left: '↩️',
  coverage_issue: '🏥',
  custom: '💬',
  reply: '↪️'
};

const statusLabel: Record<string, string> = { unread: 'No leído', read: 'Leído', resolved: 'Resuelto' };

export const internalMessagePersonName = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '—';
  const item = value as { firstName?: string; lastName?: string; displayName?: string; email?: string };
  return item.displayName ?? (`${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.email || '—');
};

const messageId = (message: InternalMessageDto): string => message._id ?? message.id ?? '';

const briefDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatArgentinaTime(isoDate);
  return formatArgentinaDate(isoDate);
};

interface InternalMessageDetailModalProps {
  accessToken: string;
  organizationId: string;
  message: InternalMessageDto;
  allowReply?: boolean;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
  onMarkRead?: (messageId: string) => Promise<unknown>;
  onResolve?: (messageId: string) => Promise<unknown>;
}

export const InternalMessageDetailModal = ({ accessToken, organizationId, message, allowReply = false, onClose, onRefresh, onMarkRead, onResolve }: InternalMessageDetailModalProps): ReactElement => {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const runAction = async (action: 'read' | 'resolve'): Promise<void> => {
    setBusy(action);
    setSuccess('');
    try {
      if (action === 'read') await (onMarkRead ? onMarkRead(messageId(message)) : organizationApi.markInternalMessageRead(accessToken, organizationId, messageId(message)));
      else await (onResolve ? onResolve(messageId(message)) : organizationApi.resolveInternalMessage(accessToken, organizationId, messageId(message)));
      await onRefresh();
      setSuccess(action === 'read' ? 'Mensaje marcado como leído.' : 'Mensaje resuelto.');
    } finally {
      setBusy(null);
    }
  };

  const sendReply = async (): Promise<void> => {
    const text = reply.trim();
    if (!text) return;
    setBusy('reply');
    setSuccess('');
    try {
      await organizationApi.replyInternalMessage(accessToken, organizationId, messageId(message), text);
      setReply('');
      await onRefresh();
      setSuccess('Respuesta enviada al profesional.');
    } finally {
      setBusy(null);
    }
  };

  const appointment = message.appointmentId && typeof message.appointmentId === 'object' ? message.appointmentId : null;
  const appointmentId = typeof message.appointmentId === 'string' ? message.appointmentId : appointment?._id;

  const modal = <div className="nx-internal-modal" role="dialog" aria-modal="true" aria-labelledby={`internal-message-${messageId(message)}`}>
    <button type="button" className="nx-internal-modal__overlay" aria-label="Cerrar detalle del mensaje" onClick={onClose} />
    <section className="nx-internal-modal__card">
      <header className="nx-internal-modal__header">
        <div>
          <span className="nx-internal-modal__eyebrow">{internalMessageTypeLabel[message.type] ?? message.type}</span>
          <h2 id={`internal-message-${messageId(message)}`}>{message.title || 'Mensaje interno'}</h2>
        </div>
        <span className={`nx-internal-status nx-internal-status--${message.status}`}>{statusLabel[message.status] ?? message.status}</span>
      </header>

      <dl className="nx-internal-detail-grid">
        <div><dt>Profesional</dt><dd>{internalMessagePersonName(message.professionalId)}</dd></div>
        <div><dt>Paciente</dt><dd>{internalMessagePersonName(message.patientProfileId)}</dd></div>
        <div><dt>Fecha y hora</dt><dd>{formatArgentinaDate(message.createdAt)} {formatArgentinaTime(message.createdAt)}</dd></div>
        <div><dt>Turno asociado</dt><dd>{appointmentId ? <Link to={`/app/appointments/${appointmentId}`}>Ver turno</Link> : '—'}</dd></div>
      </dl>

      <div className="nx-internal-message-body">
        <h3>Mensaje completo</h3>
        <p>{message.message || 'Sin texto adicional.'}</p>
      </div>

      {allowReply && message.fromRole !== 'secretary' ? <div className="nx-internal-reply-box">
        <label>Responder al profesional<textarea placeholder="Escribí una respuesta operativa" value={reply} onChange={(event) => setReply(event.target.value)} /></label>
        <button type="button" className="nx-btn-primary" disabled={busy === 'reply' || !reply.trim()} onClick={() => void sendReply()}>{busy === 'reply' ? 'Enviando...' : 'Enviar respuesta'}</button>
      </div> : null}

      {success ? <p className="nx-internal-success" role="status">{success}</p> : null}

      <footer className="nx-internal-modal__actions">
        {message.status !== 'resolved' ? <>
          <button type="button" className="nx-btn-secondary" disabled={message.status !== 'unread' || busy === 'read'} onClick={() => void runAction('read')}>Marcar como leído</button>
          <button type="button" className="nx-btn-secondary" disabled={busy === 'resolve'} onClick={() => void runAction('resolve')}>Resolver</button>
        </> : <span className="nx-internal-resolved-note">Este mensaje ya está resuelto.</span>}
        <button type="button" className="nx-btn-primary" onClick={onClose}>Cerrar</button>
      </footer>
    </section>
  </div>;

  return createPortal(modal, document.body);
};



interface InternalMessagePopupProps {
  message: InternalMessageDto;
  currentRole: 'secretary' | 'professional';
  markingRead?: boolean;
  onViewMessage: () => void;
  onMarkRead: () => void;
  onClose: () => void;
}

export const InternalMessagePopup = ({ message, currentRole, markingRead = false, onViewMessage, onMarkRead, onClose }: InternalMessagePopupProps): ReactElement => {
  const senderLabel = currentRole === 'professional' ? 'Secretaría / Administración' : internalMessagePersonName(message.professionalId);
  const title = currentRole === 'professional' ? 'Nuevo mensaje de secretaría' : 'Nuevo mensaje del profesional';
  const appointment = message.appointmentId && typeof message.appointmentId === 'object' ? message.appointmentId : null;
  const appointmentText = (appointment?._id || typeof message.appointmentId === 'string') ? 'Turno asociado' : '—';
  const popup = <div className="nx-internal-alert" role="dialog" aria-modal="true" aria-label="Nuevo mensaje interno">
    <button type="button" className="nx-internal-alert__overlay" aria-label="Cerrar aviso de mensaje interno" onClick={onClose} />
    <section className="nx-internal-alert__card">
      <span className="nx-internal-alert__eyebrow">Nuevo mensaje interno</span>
      <h2>{title}</h2>
      <div className="nx-internal-alert__badge">{internalMessageTypeLabel[message.type] ?? message.type}</div>
      <dl className="nx-internal-alert__details">
        <div><dt>De</dt><dd>{senderLabel}</dd></div>
        <div><dt>Paciente</dt><dd>{internalMessagePersonName(message.patientProfileId)}</dd></div>
        <div><dt>Turno</dt><dd>{appointmentText}</dd></div>
      </dl>
      <div className="nx-internal-alert__summary"><b>Mensaje:</b><p>{message.message || 'Sin texto adicional.'}</p></div>
      <div className="nx-internal-alert__actions">
        <button type="button" className="nx-btn-primary" onClick={onViewMessage}>Ver mensaje</button>
        <button type="button" className="nx-btn-secondary" disabled={markingRead} onClick={onMarkRead}>{markingRead ? 'Marcando...' : 'Marcar leído'}</button>
        <button type="button" className="nx-btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </section>
  </div>;

  return createPortal(popup, document.body);
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
  const [selectedMessage, setSelectedMessage] = useState<InternalMessageDto | null>(null);

  return <Card title="Mensajes internos" subtitle="Bandeja compacta de comunicación operativa.">
    {loading ? <p>Cargando mensajes...</p> : null}
    {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    {!loading && !error && messages.length === 0 ? <p>No hay mensajes internos pendientes para mostrar.</p> : null}
    <div className="nx-internal-list">
      {messages.map((message) => {
        const id = messageId(message);
        const patientName = internalMessagePersonName(message.patientProfileId);
        return <button key={id} type="button" className={`nx-internal-row nx-internal-row--${message.type}${message.status === 'unread' ? ' is-unread' : ''}`} onClick={() => setSelectedMessage(message)}>
          <span className="nx-internal-row__icon" aria-hidden="true">{typeIcon[message.type] ?? '💬'}</span>
          <span className="nx-internal-row__main">
            <strong>{internalMessagePersonName(message.professionalId)}</strong>
            <span>{internalMessageTypeLabel[message.type] ?? message.type}{patientName !== '—' ? ` · ${patientName}` : ''}</span>
          </span>
          <span className="nx-internal-row__meta">
            <time dateTime={message.createdAt}>{briefDate(message.createdAt)}</time>
            <span className={`nx-internal-status nx-internal-status--${message.status}`}>{statusLabel[message.status] ?? message.status}</span>
          </span>
        </button>;
      })}
    </div>
    {selectedMessage ? <InternalMessageDetailModal accessToken={accessToken} organizationId={organizationId} message={selectedMessage} allowReply={allowReply} onClose={() => setSelectedMessage(null)} onRefresh={async () => { await onRefresh(); }} /> : null}
  </Card>;
};
