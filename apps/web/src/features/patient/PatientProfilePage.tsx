import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { PatientProfileDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { WebPushCard } from '../notifications/WebPushCard';

const emptyProfile: Partial<PatientProfileDto> = { acceptsNotifications: false, acceptsReminders: false, acceptsEmailCommunications: false, acceptsWhatsAppCommunications: false };
export const PatientProfilePage = (): ReactElement => {
  const { user, accessToken } = useAuth();
  const [profile, setProfile] = useState<Partial<PatientProfileDto>>(emptyProfile);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (!accessToken) return; void patientApi.getMe(accessToken).then((me) => setProfile(me.patientProfile)).catch((e) => setError((e as Error).message)); }, [accessToken]);
  const bind = (key: keyof PatientProfileDto) => ({ value: (profile[key] as string | null) ?? '', onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setProfile((p) => ({ ...p, [key]: e.target.value })) });
  return <main className="nx-page" style={{ maxWidth: 900 }}>
    <Card title="Perfil del paciente" subtitle="Ficha personal para consultorios y clínicas.">{error && <p style={{ color: 'var(--danger)' }}>{error}</p>}{message && <p style={{ color: '#166534' }}>{message}</p>}
      <form className="nx-form-grid" onSubmit={(e) => e.preventDefault()}>
        <h3>Datos personales</h3><label className="nx-field">Nombre*<input {...bind('firstName')} /></label><label className="nx-field">Apellido*<input {...bind('lastName')} /></label><label className="nx-field">DNI*<input {...bind('documentId')} /></label><label className="nx-field">Fecha nacimiento*<input type="date" {...bind('dateOfBirth')} /></label><label className="nx-field">Sexo<select {...bind('sex')}><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>No binario</option><option>Prefiero no decir</option></select></label><label className="nx-field">Nacionalidad<input {...bind('nationality')} /></label>
        <h3>Contacto</h3><label className="nx-field">Teléfono*<input {...bind('phone')} /></label><label className="nx-field">Email*<input value={user?.email ?? ''} disabled /></label><label className="nx-field">Dirección<input {...bind('address')} /></label><label className="nx-field">Ciudad<input {...bind('city')} /></label><label className="nx-field">Provincia<input {...bind('province')} /></label>
        <h3>Contacto de emergencia</h3><label className="nx-field">Nombre*<input {...bind('emergencyContactName')} /></label><label className="nx-field">Teléfono*<input {...bind('emergencyContactPhone')} /></label><label className="nx-field">Relación*<input {...bind('emergencyContactRelationship')} /></label>
        <h3>Cobertura médica</h3><label className="nx-field">Obra social<input {...bind('insuranceProvider')} /></label><label className="nx-field">N° afiliado<input {...bind('insuranceMemberId')} /></label><label className="nx-field">Plan<input {...bind('insurancePlan')} /></label>
        <h3>Información de salud</h3><label className="nx-field">Grupo sanguíneo<input {...bind('bloodType')} /></label><label className="nx-field">Alergias<textarea {...bind('allergies')} /></label><label className="nx-field">Medicación habitual<textarea {...bind('regularMedication')} /></label><label className="nx-field">Enfermedades preexistentes<textarea {...bind('preexistingConditions')} /></label><label className="nx-field">Cirugías previas<textarea {...bind('previousSurgeries')} /></label><label className="nx-field">Observaciones médicas<textarea {...bind('medicalNotes')} /></label>
        <h3>Preferencias</h3><label className="nx-field">Preferencia contacto<select {...bind('contactPreference')}><option value="">Seleccionar</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="telefono">Teléfono</option></select></label>
        <label><input type="checkbox" checked={!!profile.acceptsNotifications} onChange={(e) => setProfile((p) => ({ ...p, acceptsNotifications: e.target.checked }))} /> Acepta notificaciones</label>
        <label><input type="checkbox" checked={!!profile.acceptsReminders} onChange={(e) => setProfile((p) => ({ ...p, acceptsReminders: e.target.checked }))} /> Acepta recordatorios</label>
        <label><input type="checkbox" checked={!!profile.acceptsEmailCommunications} onChange={(e) => setProfile((p) => ({ ...p, acceptsEmailCommunications: e.target.checked }))} /> Comunicaciones por email</label>
        <label><input type="checkbox" checked={!!profile.acceptsWhatsAppCommunications} onChange={(e) => setProfile((p) => ({ ...p, acceptsWhatsAppCommunications: e.target.checked }))} /> Comunicaciones por WhatsApp</label>
        <button type="button" className="nx-btn" onClick={async () => { if (!accessToken) return; try { await patientApi.patchMe(accessToken, profile); setMessage('Perfil actualizado.'); setError(''); } catch (e) { setError((e as Error).message); } }}>Guardar perfil</button>
      </form>
    </Card>
    {accessToken ? <WebPushCard accessToken={accessToken} /> : null}
  </main>;
};
