import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi } from './admin-api';

type Settings = any;
const templateKeys = ['confirmation', 'test', 'reminder', 'cancellation', 'rescheduled', 'notice'] as const;

export const AdminWhatsAppSettingsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [suspended, setSuspended] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try { setSettings(await adminApi.getWhatsAppSettings(accessToken)); } catch (cause) { setError((cause as Error).message); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [accessToken]);
  if (!accessToken) return <Navigate to="/login" replace />;
  const update = (patch: Record<string, unknown>) => setSettings((current: Settings | null) => current ? { ...current, ...patch } : current);
  const templates = settings?.templates as Record<string, string | null> | undefined;

  return <main style={{ maxWidth: 1100, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
    <Card title="WhatsApp global" subtitle="Configuración central del número oficial de NexMed para todos los centros.">
      {loading ? <p>Cargando configuración...</p> : null}{error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}{message ? <p style={{ color: '#047857' }}>{message}</p> : null}
      {settings ? <form style={{ display: 'grid', gap: '1rem' }} onSubmit={(event) => { event.preventDefault(); void (async () => { setSaving(true); setError(''); setMessage(''); try { const saved = await adminApi.updateWhatsAppSettings(accessToken, settings); setSettings(saved); setMessage('Configuración global guardada.'); } catch (cause) { setError((cause as Error).message); } finally { setSaving(false); } })(); }}>
        <section style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 12 }}><b>Proveedor:</b> Meta Cloud API · <b>Estado técnico:</b> {settings.globalProviderConfigured ? 'Configurado' : 'No configurado'} · <b>Imagen:</b> {settings.headerImageConfigured ? 'Configurada' : 'No configurada'}</section>
        <label><input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> WhatsApp global activo</label>
        <label>Nombre remitente <input value={settings.senderDisplayName ?? ''} onChange={(e) => update({ senderDisplayName: e.target.value })} /></label>
        <label>Teléfono mostrado <input value={settings.senderDisplayPhone ?? ''} onChange={(e) => update({ senderDisplayPhone: e.target.value || null })} /></label>
        <label><input type="checkbox" checked={settings.sendConfirmation} onChange={(e) => update({ sendConfirmation: e.target.checked })} /> Enviar confirmación al reservar</label>
        <label><input type="checkbox" checked={settings.sendMidpointReminder} onChange={(e) => update({ sendMidpointReminder: e.target.checked })} /> Enviar aviso de mitad de tiempo</label>
        <label><input type="checkbox" checked={settings.sendReminder} onChange={(e) => update({ sendReminder: e.target.checked })} /> Enviar recordatorio antes del turno</label>
        <label><input type="checkbox" checked={settings.sendSecondReminder} onChange={(e) => update({ sendSecondReminder: e.target.checked })} /> Enviar segundo recordatorio</label>
        <label>Recordatorio principal: horas antes <input type="number" min={1} max={720} value={settings.reminderHoursBefore} onChange={(e) => update({ reminderHoursBefore: Number(e.target.value) })} /></label>
        <label>Segundo recordatorio: horas antes <input type="number" min={1} max={720} value={settings.secondReminderHoursBefore ?? 2} onChange={(e) => update({ secondReminderHoursBefore: Number(e.target.value) })} /></label>
        <label>Idioma template <select value={settings.templateLanguage} onChange={(e) => update({ templateLanguage: e.target.value })}><option value="es_AR">Español (Argentina) — es_AR</option></select></label>
        {templates ? <div style={{ display: 'grid', gap: '.5rem' }}>{templateKeys.map((key) => <label key={key}>Template {key}<input value={templates[key] ?? ''} onChange={(e) => update({ templates: { ...templates, [key]: e.target.value || null } })} /></label>)}</div> : null}
        <button className="nx-btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración global'}</button>
      </form> : null}
    </Card>
    <Card title="Suspender WhatsApp para un centro" subtitle="La suspensión solo afecta a la organización indicada; no cambia el consentimiento individual ni el historial.">
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}><input placeholder="Organization ID" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} /><label><input type="checkbox" checked={suspended} onChange={(e) => setSuspended(e.target.checked)} /> Suspendido</label><button className="nx-btn" onClick={() => void adminApi.setOrganizationWhatsAppSuspension(accessToken, organizationId, suspended).then(() => { setMessage('Suspensión actualizada.'); return load(); }).catch((cause) => setError((cause as Error).message))}>Aplicar</button></div>
      <p>Organizaciones suspendidas: {settings?.suspendedOrganizationIds?.length ? settings.suspendedOrganizationIds.join(', ') : 'ninguna'}</p>
    </Card>
  </main>;
};
