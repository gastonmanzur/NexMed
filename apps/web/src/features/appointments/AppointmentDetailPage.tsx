import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { PatientDetailModal } from '../organizations/PatientDetailModal';
import { organizationApi } from '../organizations/organization-api';
import { appointmentsApi } from './appointments-api';
import type { AppointmentDto, AppointmentStatus, OrganizationPatientDetailDto } from '@starter/shared-types';
import { centerStatusActions, isPendingClosure } from './appointment-status';

const formatDate = (value: string): string => new Date(value).toLocaleDateString('es-AR');
const formatTime = (value: string): string => new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const getAppointmentPatientName = (appointment: AppointmentDto): string => appointment.beneficiaryDisplayName ?? appointment.patientName;

export const AppointmentDetailPage = (): ReactElement => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, accessToken, activeOrganizationId } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<OrganizationPatientDetailDto | null>(null);
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
    if (!appointment?.patientProfileId || !accessToken || !activeOrganizationId) return;

    setIsPatientModalOpen(true);
    setLoadingPatientDetail(true);
    setPatientDetailError('');
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
    <main data-testid="appointment-detail-real-component" style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Detalle de turno">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="nx-btn-secondary" to="/app/appointments">Volver al listado</Link>
          {appointment && ['booked', 'confirmed_by_patient'].includes(appointment.status) ? <Link className="nx-btn-secondary" to={`/app/appointments/${appointment.id}/reschedule`}>Reprogramar</Link> : null}
        </div>

        {loading ? <p>Cargando turno...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

        {appointment ? (
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <dl style={{ display: 'grid', gap: '0.5rem', margin: 0 }}>
              <div><dt>Paciente</dt><dd>{getAppointmentPatientName(appointment)}</dd></div>
              <div><dt>Fecha</dt><dd>{formatDate(appointment.startAt)}</dd></div>
              <div><dt>Inicio</dt><dd>{formatTime(appointment.startAt)}</dd></div>
              <div><dt>Fin</dt><dd>{formatTime(appointment.endAt)}</dd></div>
            </dl>

            <div>
              <button type="button" disabled={!appointment.patientProfileId || loadingPatientDetail} onClick={() => void openPatientDetail()}>
                {loadingPatientDetail ? 'Cargando datos...' : 'Datos del paciente'}
              </button>
              {!appointment.patientProfileId ? <p style={{ color: 'var(--text-soft)', margin: '0.5rem 0 0' }}>Este turno no tiene un perfil de paciente vinculado.</p> : null}
            </div>

            {centerStatusActions(appointment.status).length > 0 ? (
              <section>
                <h3 style={{ margin: '0 0 0.5rem' }}>Acciones operativas</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {centerStatusActions(appointment.status).map((action) => (
                    <button key={action.status} type="button" disabled={updatingStatus === action.status} onClick={() => void updateStatus(action.status, action.note)}>
                      {isPendingClosure(appointment.status, appointment.endAt) && action.status === 'completed' ? 'Marcar atendido' : isPendingClosure(appointment.status, appointment.endAt) && action.status === 'no_show' ? 'Marcar no asistió' : action.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </Card>
      <PatientDetailModal patient={selectedPatient} isOpen={isPatientModalOpen} loading={loadingPatientDetail} error={patientDetailError} onClose={closePatientDetail} />
    </main>
  );
};
