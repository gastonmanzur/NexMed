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
    <div className="pro-hero">
      <div><span>Atención actual</span><h1>Paciente: {appointment.patientName}</h1><p>{age(patient?.dateOfBirth)} · Cobertura: {coverage} · Estado: <b>En atención</b></p></div>
      <div className="pro-actions"><button onClick={saveEncounter} disabled={signed}>Guardar evolución</button><button onClick={complete}>Finalizar atención</button><Link to="/app/professional/waiting-room">Volver a sala de espera</Link></div>
    </div>
    <div className="attention-grid">
      <aside className="pro-panel"><h2>Ficha del paciente</h2><p><b>Nombre:</b> {appointment.patientName}</p><p><b>Fecha nacimiento:</b> {patient?.dateOfBirth ? fmt(patient.dateOfBirth).split(',')[0] : '—'}</p><p><b>Teléfono:</b> {patient?.phone ?? appointment.patientPhone ?? '—'}</p><p><b>Email:</b> {appointment.patientEmail ?? '—'}</p><p><b>DNI:</b> {patient?.documentId ?? '—'}</p><p><b>Afiliado:</b> {appointment.insuranceMemberNumber ?? '—'}</p><p><b>Turno:</b> {fmt(appointment.startAt)}</p><p><b>Llegada:</b> {fmt(appointment.arrivedAt)}</p><p><b>Atenciones previas:</b> {data.previousEncounters.length}</p></aside>
      <main className="pro-panel"><h2>Evolución actual <span className={`pro-status pro-status--${signed ? 'completed' : 'in_progress'}`}>{signed ? 'Evolución firmada' : 'Evolución borrador'}</span></h2>{['reason','evolution','diagnosisText','treatmentPlan','observations'].map((field) => <label key={field}>{({reason:'Motivo de consulta', evolution:'Evolución', diagnosisText:'Diagnóstico / impresión diagnóstica', treatmentPlan:'Conducta / tratamiento', observations:'Observaciones'} as Record<string,string>)[field]}<textarea disabled={signed} value={(encounter as any)[field]} onChange={(e) => setEncounter({ ...encounter, [field]: e.target.value })} /></label>)}<button onClick={sign} disabled={signed || !((encounter.reason ?? '').trim() || (encounter.evolution ?? '').trim())}>Firmar evolución</button>
        <h2>Historia clínica</h2>{['relevantHistory','allergies','chronicConditions','currentMedications','generalObservations'].map((field) => <label key={field}>{({relevantHistory:'Antecedentes relevantes', allergies:'Alergias', chronicConditions:'Enfermedades crónicas', currentMedications:'Medicación habitual', generalObservations:'Observaciones generales'} as Record<string,string>)[field]}<textarea value={(record as any)[field]} onChange={(e) => setRecord({ ...record, [field]: e.target.value })} /></label>)}<button onClick={saveRecord}>Guardar historia clínica</button>
        <h2>Atenciones anteriores</h2>{data.previousEncounters.length ? data.previousEncounters.map((e) => <article className="timeline-item" key={e._id ?? e.id}><b>{fmt(e.createdAt)}</b><p>Motivo: {e.reason || '—'}</p><p>Diagnóstico: {e.diagnosisText || '—'}</p><p>{e.evolution || 'Sin resumen'}</p></article>) : <p>No hay atenciones anteriores en este centro.</p>}
      </main>
      <aside className="pro-panel"><h2>Comunicación</h2><button onClick={() => sendMessage('call_patient', `Por favor hacé pasar a ${appointment.patientName}.`)}>Pedir que pase el paciente</button><button onClick={() => sendMessage('delay_notice', 'Estoy demorado 10 minutos.')}>Avisar demora</button><button onClick={() => sendMessage('admin_request', 'Falta validar datos administrativos del paciente.')}>Solicitar dato administrativo</button><button onClick={() => sendMessage('documentation_missing', 'Solicitar documentación antes de continuar.')}>Solicitar documentación</button><button onClick={() => sendMessage('payment_pending', 'Solicitar pago antes de la atención.')}>Solicitar cobro</button><textarea placeholder="Mensaje personalizado" value={message} onChange={(e) => setMessage(e.target.value)} /><button onClick={() => sendMessage()}>Mensaje a secretaría</button></aside>
    </div>
  </section>;
};
