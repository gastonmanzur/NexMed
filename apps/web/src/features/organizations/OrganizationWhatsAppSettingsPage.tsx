import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationWhatsAppApi } from './organization-api';

type FormState = {
  enabled: boolean;
  provider: 'manual' | 'noop' | 'meta_cloud_api';
  displayPhoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiVersion: string;
  accessToken: string;
  appointmentConfirmation: string;
  appointmentReminder: string;
  appointmentCancellation: string;
  appointmentRescheduled: string;
  reminderHoursBefore: number;
  secondReminderHoursBefore: string;
};

const defaults: FormState = {
  enabled: false,
  provider: 'noop',
  displayPhoneNumber: '',
  phoneNumberId: '',
  businessAccountId: '',
  apiVersion: 'v22.0',
  accessToken: '',
  appointmentConfirmation: 'appointment_confirmation',
  appointmentReminder: 'appointment_reminder',
  appointmentCancellation: 'appointment_cancellation',
  appointmentRescheduled: 'appointment_rescheduled',
  reminderHoursBefore: 24,
  secondReminderHoursBefore: ''
};

export const OrganizationWhatsAppSettingsPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [form, setForm] = useState(defaults);
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const settings = await organizationWhatsAppApi.getSettings(accessToken, activeOrganizationId);
        if (settings) {
          setForm({
            enabled: settings.enabled,
            provider: settings.provider,
            displayPhoneNumber: settings.displayPhoneNumber ?? '',
            phoneNumberId: settings.meta.phoneNumberId ?? '',
            businessAccountId: settings.meta.businessAccountId ?? '',
            apiVersion: settings.meta.apiVersion ?? 'v22.0',
            accessToken: '',
            appointmentConfirmation: settings.templates.appointmentConfirmation,
            appointmentReminder: settings.templates.appointmentReminder,
            appointmentCancellation: settings.templates.appointmentCancellation,
            appointmentRescheduled: settings.templates.appointmentRescheduled,
            reminderHoursBefore: settings.reminderHoursBefore,
            secondReminderHoursBefore: settings.secondReminderHoursBefore?.toString() ?? ''
          });
          setHasToken(settings.meta.hasAccessToken);
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, activeOrganizationId]);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;

  const update = (key: keyof typeof defaults, value: string | boolean | number): void => setForm((current) => ({ ...current, [key]: value }));

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '1rem' }}>
      <Card title="WhatsApp / Notificaciones" subtitle="Configurá el número emisor y los templates por centro.">
        {loading ? <p>Cargando configuración...</p> : null}
        {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
        {message ? <p style={{ color: '#047857' }}>{message}</p> : null}
        <form
          style={{ display: 'grid', gap: '1rem' }}
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              setSaving(true);
              setError('');
              setMessage('');
              try {
                const saved = await organizationWhatsAppApi.updateSettings(accessToken, activeOrganizationId, {
                  enabled: form.enabled,
                  provider: form.provider,
                  displayPhoneNumber: form.displayPhoneNumber || null,
                  meta: {
                    phoneNumberId: form.phoneNumberId || null,
                    businessAccountId: form.businessAccountId || null,
                    apiVersion: form.apiVersion || null,
                    accessToken: form.accessToken || null
                  },
                  templates: {
                    appointmentConfirmation: form.appointmentConfirmation,
                    appointmentReminder: form.appointmentReminder,
                    appointmentCancellation: form.appointmentCancellation,
                    appointmentRescheduled: form.appointmentRescheduled
                  },
                  reminderHoursBefore: Number(form.reminderHoursBefore),
                  secondReminderHoursBefore: form.secondReminderHoursBefore ? Number(form.secondReminderHoursBefore) : null
                });
                setHasToken(saved.meta.hasAccessToken);
                setForm((current) => ({ ...current, accessToken: '' }));
                setMessage('Configuración guardada.');
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <label><input type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} /> Activar notificaciones por WhatsApp</label>
          {!form.enabled || form.provider !== 'meta_cloud_api' ? <p>WhatsApp automático no configurado: las notificaciones se registrarán como pendientes/manuales según el proveedor.</p> : null}
          <label>Proveedor
            <select value={form.provider} onChange={(e) => update('provider', e.target.value as typeof form.provider)}>
              <option value="noop">Noop</option>
              <option value="manual">Manual</option>
              <option value="meta_cloud_api">Meta Cloud API</option>
            </select>
          </label>
          <label>Número visible del centro <input value={form.displayPhoneNumber} onChange={(e) => update('displayPhoneNumber', e.target.value)} /></label>
          <label>Phone Number ID <input value={form.phoneNumberId} onChange={(e) => update('phoneNumberId', e.target.value)} /></label>
          <label>Business Account ID <input value={form.businessAccountId} onChange={(e) => update('businessAccountId', e.target.value)} /></label>
          <label>API version <input value={form.apiVersion} onChange={(e) => update('apiVersion', e.target.value)} /></label>
          <label>Access token {hasToken ? '(ya hay uno guardado; dejá vacío para mantenerlo)' : ''}<input type="password" value={form.accessToken} onChange={(e) => update('accessToken', e.target.value)} /></label>
          <label>Template confirmación <input value={form.appointmentConfirmation} onChange={(e) => update('appointmentConfirmation', e.target.value)} /></label>
          <label>Template recordatorio <input value={form.appointmentReminder} onChange={(e) => update('appointmentReminder', e.target.value)} /></label>
          <label>Template cancelación <input value={form.appointmentCancellation} onChange={(e) => update('appointmentCancellation', e.target.value)} /></label>
          <label>Template reprogramación <input value={form.appointmentRescheduled} onChange={(e) => update('appointmentRescheduled', e.target.value)} /></label>
          <label>Recordatorio: horas antes <input type="number" min="1" max="720" value={form.reminderHoursBefore} onChange={(e) => update('reminderHoursBefore', Number(e.target.value))} /></label>
          <label>Segundo recordatorio opcional <input type="number" min="1" max="720" value={form.secondReminderHoursBefore} onChange={(e) => update('secondReminderHoursBefore', e.target.value)} /></label>
          <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración'}</button>
        </form>
      </Card>
    </main>
  );
};
