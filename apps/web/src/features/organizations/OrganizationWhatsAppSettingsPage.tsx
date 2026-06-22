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
  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('Paciente de prueba');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
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
  const update = (patch: Record<string, unknown>) => setSettings((current: Settings | null) => current ? { ...current, ...patch } : current);
  const templates = settings?.templates as Record<string, string> | undefined;
  return <main style={{ maxWidth: 1100, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
    <Card title="WhatsApp" subtitle="Notificaciones automáticas de turnos">
      {loading ? <p>Cargando configuración...</p> : null}{error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}{message ? <p style={{ color: '#047857' }}>{message}</p> : null}
      {settings ? <form style={{ display: 'grid', gap: '1rem' }} onSubmit={(event) => { event.preventDefault(); void (async () => { setSaving(true); setError(''); setMessage(''); try { const saved = await organizationWhatsAppApi.updateSettings(accessToken, activeOrganizationId, settings as any); setSettings(saved); setMessage('Configuración guardada.'); } catch (cause) { setError((cause as Error).message); } finally { setSaving(false); } })(); }}>
        <section style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 12 }}><b>Proveedor:</b> Meta Cloud API · <b>Remitente:</b> {settings.senderDisplayName ?? 'NexMed'} · <b>Estado:</b> {settings.globalProviderConfigured ? 'Configurado' : 'No configurado'}</section>
        <section style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 12, display: 'grid', gap: '.5rem' }}><b>Imagen de encabezado</b><span>Las notificaciones oficiales de NexMed incluyen una imagen institucional.</span><span><b>Estado:</b> {settings.headerImageConfigured ? 'Configurada' : 'No configurada'}</span></section>
        <label><input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> Activar WhatsApp para este centro</label>
        <label><input type="checkbox" checked={settings.sendConfirmation} onChange={(e) => update({ sendConfirmation: e.target.checked })} /> Enviar confirmación al reservar</label>
        <label><input type="checkbox" checked={settings.sendMidpointReminder} onChange={(e) => update({ sendMidpointReminder: e.target.checked })} /> Enviar aviso de mitad de tiempo</label>
        <label><input type="checkbox" checked={settings.sendReminder} onChange={(e) => update({ sendReminder: e.target.checked })} /> Enviar recordatorio antes del turno</label>
        <label><input type="checkbox" checked={settings.sendSecondReminder} onChange={(e) => update({ sendSecondReminder: e.target.checked })} /> Enviar segundo recordatorio</label>
        <label>Recordatorio principal: horas antes <input type="number" min={1} max={720} value={settings.reminderHoursBefore} onChange={(e) => update({ reminderHoursBefore: Number(e.target.value) })} /></label>
        <label>Segundo recordatorio: horas antes <input type="number" min={1} max={720} value={settings.secondReminderHoursBefore ?? 2} onChange={(e) => update({ secondReminderHoursBefore: Number(e.target.value) })} /></label>
        <label>Idioma template <select value={settings.templateLanguage} onChange={(e) => update({ templateLanguage: e.target.value as 'es_AR' })}><option value="es_AR">Español (Argentina) — es_AR</option></select></label>
        {templates ? <div style={{ display: 'grid', gap: '.5rem' }}>{(['confirmation','test','reminder','cancellation','rescheduled','notice'] as const).map((key) => <label key={key}>Template {key}<input value={templates[key] ?? ''} onChange={(e) => update({ templates: { ...templates, [key]: e.target.value } })} /></label>)}</div> : null}
        <button className="nx-btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración'}</button>
      </form> : null}
    </Card>
    <Card title="Enviar WhatsApp de prueba"><div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}><input placeholder="Número destino" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} /><input placeholder="Nombre de prueba" value={testName} onChange={(e) => setTestName(e.target.value)} /><button className="nx-btn" onClick={() => void organizationWhatsAppApi.sendTest(accessToken, activeOrganizationId, { phone: testPhone, patientName: testName }).then((result) => { setMessage(result.ok ? `Prueba enviada (${result.notificationId}).` : `Prueba fallida: ${result.errorMessage ?? result.errorCode ?? result.status}`); return load(); }).catch((cause) => setError((cause as Error).message))}>Enviar prueba</button></div></Card>
    <Card title="Logs"><table style={{ width: '100%' }}><thead><tr><th>Fecha</th><th>Destino</th><th>Tipo</th><th>Estado</th><th>Último evento</th><th>Error</th></tr></thead><tbody>{logs.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.recipientPhone}</td><td>{item.type}</td><td>{badge[item.status] ?? item.status}</td><td>{item.readAt ?? item.deliveredAt ?? item.sentAt ?? item.failedAt ?? item.scheduledFor}</td><td>{item.errorMessage}</td></tr>)}</tbody></table></Card>
  </main>;
};
