import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationWhatsAppApi } from './organization-api';

type Settings = any;
type Log = { id: string; createdAt: string; type: string; status: string; scheduledFor: string; sentAt?: string | null; deliveredAt?: string | null; readAt?: string | null; failedAt?: string | null; errorMessage?: string | null; recipientPhone?: string };
const badge: Record<string, string> = { pending: 'Pendiente', processing: 'Procesando', sent: 'Enviado', delivered: 'Entregado', read: 'Leído', failed: 'Fallido', skipped: 'Omitido', cancelled: 'Cancelado' };

export const OrganizationWhatsAppSettingsPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true); setError('');
    try { setSettings(await organizationWhatsAppApi.getSettings(accessToken, activeOrganizationId)); setLogs(await organizationWhatsAppApi.listNotifications(accessToken, activeOrganizationId)); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [accessToken, activeOrganizationId]);
  if (!accessToken) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;
  const templates = settings?.templates as Record<string, string> | undefined;
  return <main style={{ maxWidth: 1100, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
    <Card title="WhatsApp" subtitle="Notificaciones automáticas de turnos">
      {loading ? <p>Cargando configuración...</p> : null}{error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
      {settings ? <div style={{ display: 'grid', gap: '1rem' }}>
        <section style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 12 }}><b>Proveedor:</b> Meta Cloud API · <b>Remitente:</b> {settings.senderDisplayName ?? 'NexMed'} · <b>Estado global:</b> {settings.globalProviderConfigured ? 'Configurado' : 'No configurado'} · <b>Alcance:</b> configuración global heredada</section>
        <section style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 12, display: 'grid', gap: '.5rem' }}><b>Estado para este centro</b><span>{settings.enabled ? 'WhatsApp está activo para esta organización.' : settings.suspendedForOrganization ? 'WhatsApp está suspendido por el administrador global para esta organización.' : 'WhatsApp global está desactivado.'}</span><span>Las plantillas y el número oficial se administran exclusivamente desde NexMed.</span></section>
        <ul style={{ display: 'grid', gap: '.5rem' }}>
          <li>Confirmación al reservar: <b>{settings.sendConfirmation ? 'Activa' : 'Inactiva'}</b></li>
          <li>Aviso de mitad de tiempo: <b>{settings.sendMidpointReminder ? 'Activo' : 'Inactivo'}</b></li>
          <li>Recordatorio principal: <b>{settings.sendReminder ? `${settings.reminderHoursBefore} h antes` : 'Inactivo'}</b></li>
          <li>Segundo recordatorio: <b>{settings.sendSecondReminder ? `${settings.secondReminderHoursBefore ?? 2} h antes` : 'Inactivo'}</b></li>
          <li>Idioma de plantillas: <b>{settings.templateLanguage}</b></li>
        </ul>
        {templates ? <div style={{ display: 'grid', gap: '.5rem' }}><b>Plantillas oficiales</b>{(['confirmation','test','reminder','cancellation','rescheduled','notice'] as const).map((key) => <span key={key}>{key}: <code>{templates[key] ?? '-'}</code></span>)}</div> : null}
      </div> : null}
    </Card>
    <Card title="Logs"><table style={{ width: '100%' }}><thead><tr><th>Fecha</th><th>Destino</th><th>Tipo</th><th>Estado</th><th>Último evento</th><th>Error</th></tr></thead><tbody>{logs.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.recipientPhone}</td><td>{item.type}</td><td>{badge[item.status] ?? item.status}</td><td>{item.readAt ?? item.deliveredAt ?? item.sentAt ?? item.failedAt ?? item.scheduledFor}</td><td>{item.errorMessage}</td></tr>)}</tbody></table></Card>
  </main>;
};
