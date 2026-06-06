import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { PatientDetailModal, type PatientDetailModalData } from '../organizations/PatientDetailModal';
import { organizationApi } from '../organizations/organization-api';
import { appointmentsApi } from './appointments-api';
import type { AppointmentDto, AppointmentStatus } from '@starter/shared-types';
import { centerStatusActions, isPendingClosure } from './appointment-status';

const formatDate = (value: string): string => new Date(value).toLocaleDateString('es-AR');
const formatTime = (value: string): string => new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const getAppointmentPatientName = (appointment: AppointmentDto): string => appointment.beneficiaryDisplayName ?? appointment.patientName;

const buildAppointmentPatientDetail = (appointment: AppointmentDto): PatientDetailModalData => ({
  patientProfile: {
    id: appointment.patientProfileId ?? appointment.id,
    userId: null,
    ownerUserId: '',
    relationshipToOwner: appointment.beneficiaryRelationship,
    isPrimaryProfile: appointment.beneficiaryType !== 'family_member',
    firstName: getAppointmentPatientName(appointment),
    lastName: null,
    phone: appointment.patientPhone,
    dateOfBirth: null,
    documentId: null,
    sex: null,
    nationality: null,
    address: null,
    city: null,
    province: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelationship: null,
    insuranceProvider: null,
    insuranceMemberId: null,
    insurancePlan: null,
    bloodType: null,
    allergies: null,
    regularMedication: null,
    preexistingConditions: null,
    previousSurgeries: null,
    medicalNotes: null,
    contactPreference: null,
    acceptsNotifications: false,
    acceptsReminders: false,
    acceptsEmailCommunications: false,
    acceptsWhatsAppCommunications: false,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  },
  email: appointment.patientEmail,
  avatarUrl: null,
  linkedAt: null,
  linkStatus: null,
  totalAppointments: null,
  lastAppointmentAt: null,
  ownerName: null
});

export const AppointmentDetailPage = (): ReactElement => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, accessToken, activeOrganizationId } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetailModalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [loadingPatientDetail, setLoadingPatientDetail] = useState(false);
  const [patientDetailError, setPatientDetailError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState('');

  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !appointmentId) return;
    setLoading(true);
    setError('');
    try {
      const data = await appointmentsApi.getById(accessToken, activeOrganizationId, appointmentId);
      setAppointment(data);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken, activeOrganizationId, appointmentId]);

  const updateStatus = async (status: AppointmentStatus, note?: string): Promise<void> => {
    if (!appointment || !accessToken || !activeOrganizationId) return;
    setUpdatingStatus(status);
    setError('');
    try {
      const updated = await appointmentsApi.updateStatus(accessToken, activeOrganizationId, appointment.id, { status, ...(note ? { note } : {}) });
      setAppointment(updated);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setUpdatingStatus('');
    }
  };

  const openPatientDetail = async (): Promise<void> => {
    if (!appointment) return;

    setIsPatientModalOpen(true);
    setPatientDetailError('');

    if (!appointment.patientProfileId || !accessToken || !activeOrganizationId) {
      setSelectedPatient(buildAppointmentPatientDetail(appointment));
      return;
    }

    setLoadingPatientDetail(true);
    try {
      setSelectedPatient(await organizationApi.getPatientDetail(accessToken, activeOrganizationId, appointment.patientProfileId));
    } catch (cause) {
      setPatientDetailError((cause as Error).message);
    } finally {
      setLoadingPatientDetail(false);
    }
  };

  const closePatientDetail = (): void => {
    setIsPatientModalOpen(false);
    setSelectedPatient(null);
    setPatientDetailError('');
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;
  if (!appointmentId) return <Navigate to="/app/appointments" replace />;

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Detalle de turno">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="nx-btn-secondary" to="/app/appointments">Volver al listado</Link>
          {appointment && ['booked', 'confirmed_by_patient'].includes(appointment.status) ? <Link className="nx-btn-secondary" to={`/app/appointments/${appointment.id}/reschedule`}>Reprogramar</Link> : null}
        </div>

        {loading ? <p>Cargando turno...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

        {appointment ? (
          <section aria-label="Datos básicos del turno" style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Datos básicos del turno</h2>
            <dl style={{ display: 'grid', gap: '0.5rem', margin: 0 }}>
              <div><dt>Paciente</dt><dd>{getAppointmentPatientName(appointment)}</dd></div>
              <div><dt>Fecha</dt><dd>{formatDate(appointment.startAt)}</dd></div>
              <div><dt>Inicio</dt><dd>{formatTime(appointment.startAt)}</dd></div>
              <div><dt>Fin</dt><dd>{formatTime(appointment.endAt)}</dd></div>
            </dl>

            <div>
              <button className="nx-btn" type="button" disabled={loadingPatientDetail} onClick={() => void openPatientDetail()}>
                {loadingPatientDetail ? 'Cargando datos...' : 'Datos del paciente'}
              </button>
              {!appointment.patientProfileId ? <p style={{ color: 'var(--text-soft)', margin: '0.5rem 0 0' }}>Se mostrarán los datos disponibles cargados en este turno.</p> : null}
            </div>

            {centerStatusActions(appointment.status).length > 0 ? (
              <section>
                <h3 style={{ margin: '0 0 0.5rem' }}>Acciones operativas</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {centerStatusActions(appointment.status).map((action) => (
                    <button className="nx-btn-secondary" key={action.status} type="button" disabled={updatingStatus === action.status} onClick={() => void updateStatus(action.status, action.note)}>
                      {isPendingClosure(appointment.status, appointment.endAt) && action.status === 'completed' ? 'Marcar atendido' : isPendingClosure(appointment.status, appointment.endAt) && action.status === 'no_show' ? 'Marcar no asistió' : action.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}
      </Card>
      <PatientDetailModal patient={selectedPatient} isOpen={isPatientModalOpen} loading={loadingPatientDetail} error={patientDetailError} onClose={closePatientDetail} />
    </main>
  );
};
