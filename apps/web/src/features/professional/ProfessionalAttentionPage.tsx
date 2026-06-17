import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useAuth } from '../auth/AuthContext';
import { professionalApi, type AttentionData, type EncounterInput } from './professional-api';

const fmt = (v?: string | Date | null): string => v ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) : '—';
const age = (v?: string | null): string => {
  if (!v) return '—';
  const d = new Date(v); const n = new Date(); let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a -= 1;
  return `${a} años`;
};
const lines = (v?: string[]): string => v?.join('\n') ?? '';
const split = (v: string): string[] => v.split('\n').map((x) => x.trim()).filter(Boolean);
const fieldLabels: Record<string, string> = { reason: 'Motivo de consulta', evolution: 'Evolución', diagnosisText: 'Diagnóstico / impresión diagnóstica', treatmentPlan: 'Conducta / tratamiento', observations: 'Observaciones' };
const recordLabels: Record<string, string> = { relevantHistory: 'Antecedentes relevantes', allergies: 'Alergias', chronicConditions: 'Enfermedades crónicas', currentMedications: 'Medicación habitual', generalObservations: 'Observaciones generales' };

export const ProfessionalAttentionPage = (): ReactElement => {
  const { appointmentId = '' } = useParams();
  const navigate = useNavigate();
  const { accessToken, activeOrganizationId } = useAuth();
  const [data, setData] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<EncounterInput>({ reason: '', evolution: '', diagnosisText: '', treatmentPlan: '', observations: '' });
  const [record, setRecord] = useState({ relevantHistory: '', allergies: '', chronicConditions: '', currentMedications: '', generalObservations: '' });
  const [message, setMessage] = useState('');

  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    try {
      const next = await professionalApi.attention(accessToken, activeOrganizationId, appointmentId);
      setData(next);
      setEncounter({ reason: next.currentEncounter?.reason ?? '', evolution: next.currentEncounter?.evolution ?? '', diagnosisText: next.currentEncounter?.diagnosisText ?? '', treatmentPlan: next.currentEncounter?.treatmentPlan ?? '', observations: next.currentEncounter?.observations ?? '' });
      setRecord({ relevantHistory: next.clinicalRecord?.relevantHistory ?? '', allergies: lines(next.clinicalRecord?.allergies), chronicConditions: lines(next.clinicalRecord?.chronicConditions), currentMedications: lines(next.clinicalRecord?.currentMedications), generalObservations: next.clinicalRecord?.generalObservations ?? '' });
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir la atención'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [accessToken, activeOrganizationId, appointmentId]);

  const saveEncounter = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    await professionalApi.saveEncounter(accessToken, activeOrganizationId, appointmentId, encounter);
    await load();
  };
  const saveRecord = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !data?.appointment.patientProfileId) return;
    await professionalApi.updateRecord(accessToken, activeOrganizationId, data.appointment.patientProfileId, { ...record, allergies: split(record.allergies), chronicConditions: split(record.chronicConditions), currentMedications: split(record.currentMedications) });
    await load();
  };
  const sign = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    const saved = data?.currentEncounter ?? await professionalApi.saveEncounter(accessToken, activeOrganizationId, appointmentId, encounter);
    const encounterId = saved._id ?? saved.id;
    if (!encounterId) return;
    await professionalApi.signEncounter(accessToken, activeOrganizationId, encounterId);
    await load();
  };
  const complete = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    if (!data?.currentEncounter && !window.confirm('Todavía no cargaste una evolución para esta atención. ¿Querés finalizar igual?')) return;
    await professionalApi.complete(accessToken, activeOrganizationId, appointmentId);
    navigate('/app/professional/waiting-room');
  };
  const sendMessage = async (type = 'custom', text = message): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !text.trim()) return;
    await professionalApi.sendMessage(accessToken, activeOrganizationId, { appointmentId, type, message: text });
    setMessage('');
  };

  if (loading) return <LoadingState message="Abriendo atención actual..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="Atención no disponible" />;
  const patient = data.patient;
  const appointment = data.appointment;
  const signed = data.currentEncounter?.status === 'signed';
  const coverage = appointment.paymentCoverageType === 'health_insurance' ? `${appointment.healthInsuranceName ?? 'Obra social'}${appointment.insurancePlan ? ` / ${appointment.insurancePlan}` : ''}` : 'Particular';

  return <section className="professional-dashboard attention-page">
    <div className="pro-hero pro-hero--attention">
      <div>
        <span>Atención actual</span>
        <h1>{appointment.patientName}</h1>
        <p>{age(patient?.dateOfBirth)} · {coverage} · <b>En atención</b></p>
      </div>
      <div className="pro-actions"><button className="pro-button pro-button--primary" onClick={saveEncounter} disabled={signed}>Guardar evolución</button><button className="pro-button pro-button--danger" onClick={complete}>Finalizar atención</button><Link className="pro-button pro-button--ghost" to="/app/professional/waiting-room">Volver a sala de espera</Link></div>
    </div>
    <div className="attention-grid">
      <aside className="pro-panel attention-card"><h2>Ficha del paciente</h2><div className="attention-facts"><p><b>Nombre</b><span>{appointment.patientName}</span></p><p><b>Nacimiento</b><span>{patient?.dateOfBirth ? fmt(patient.dateOfBirth).split(',')[0] : '—'}</span></p><p><b>Teléfono</b><span>{patient?.phone ?? appointment.patientPhone ?? '—'}</span></p><p><b>Email</b><span>{appointment.patientEmail ?? '—'}</span></p><p><b>DNI</b><span>{patient?.documentId ?? '—'}</span></p><p><b>Afiliado</b><span>{appointment.insuranceMemberNumber ?? '—'}</span></p><p><b>Turno</b><span>{fmt(appointment.startAt)}</span></p><p><b>Llegada</b><span>{fmt(appointment.arrivedAt)}</span></p><p><b>Previas</b><span>{data.previousEncounters.length}</span></p></div></aside>
      <main className="pro-panel attention-workspace">
        <section className="attention-section"><header><div><span>Registro clínico</span><h2>Evolución actual</h2></div><strong className={`pro-status pro-status--${signed ? 'completed' : 'in_progress'}`}>{signed ? 'Evolución firmada' : 'Evolución borrador'}</strong></header>{['reason','evolution','diagnosisText','treatmentPlan','observations'].map((field) => <label key={field}>{fieldLabels[field]}<textarea disabled={signed} value={(encounter as any)[field]} onChange={(e) => setEncounter({ ...encounter, [field]: e.target.value })} /></label>)}<button className="pro-button pro-button--secondary" onClick={sign} disabled={signed || !((encounter.reason ?? '').trim() || (encounter.evolution ?? '').trim())}>Firmar evolución</button></section>
        <section className="attention-section"><header><div><span>Información longitudinal</span><h2>Historia clínica</h2></div></header>{['relevantHistory','allergies','chronicConditions','currentMedications','generalObservations'].map((field) => <label key={field}>{recordLabels[field]}<textarea value={(record as any)[field]} onChange={(e) => setRecord({ ...record, [field]: e.target.value })} /></label>)}<button className="pro-button pro-button--primary" onClick={saveRecord}>Guardar historia clínica</button></section>
        <section className="attention-section"><header><div><span>Timeline clínico</span><h2>Atenciones anteriores</h2></div></header>{data.previousEncounters.length ? data.previousEncounters.map((e) => <article className="timeline-item" key={e._id ?? e.id}><b>{fmt(e.createdAt)}</b><p>Motivo: {e.reason || '—'}</p><p>Diagnóstico: {e.diagnosisText || '—'}</p><p>{e.evolution || 'Sin resumen'}</p></article>) : <div className="pro-empty"><strong>No hay atenciones anteriores en este centro.</strong></div>}</section>
      </main>
      <aside className="pro-panel attention-card pro-panel--messages"><h2>Comunicación</h2><div className="quick-message-grid"><button className="pro-button pro-button--secondary" onClick={() => sendMessage('call_patient', `Por favor hacé pasar a ${appointment.patientName}.`)}>Pedir paciente</button><button className="pro-button pro-button--ghost" onClick={() => sendMessage('delay_notice', 'Estoy demorado 10 minutos.')}>Avisar demora</button><button className="pro-button pro-button--ghost" onClick={() => sendMessage('admin_request', 'Falta validar datos administrativos del paciente.')}>Dato administrativo</button><button className="pro-button pro-button--ghost" onClick={() => sendMessage('documentation_missing', 'Solicitar documentación antes de continuar.')}>Documentación</button><button className="pro-button pro-button--ghost" onClick={() => sendMessage('payment_pending', 'Solicitar pago antes de la atención.')}>Solicitar cobro</button></div><label>Mensaje personalizado<textarea placeholder="Escribí una novedad para secretaría" value={message} onChange={(e) => setMessage(e.target.value)} /></label><button className="pro-button pro-button--primary" onClick={() => sendMessage()}>Enviar a secretaría</button></aside>
    </div>
  </section>;
};
