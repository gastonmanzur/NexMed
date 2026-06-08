import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import './appointments-detail.css';
import { useAuth } from '../auth/AuthContext';
import { PatientDetailModal } from '../organizations/PatientDetailModal';
import { organizationApi } from '../organizations/organization-api';
import { appointmentsApi } from './appointments-api';
import type { AppointmentDto, OrganizationPatientDetailDto } from '@starter/shared-types';
import { formatArgentinaDate, formatArgentinaTime } from '../../lib/argentina-date-time';
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
    <main data-testid="appointment-detail-real-component" className="nx-appointment-detail-page">
      <Card
        title="Detalle de turno"
        subtitle="Resumen de la cita seleccionada y acceso rápido a los datos del paciente."
        className="nx-appointment-detail-card"
      >
        <div className="nx-appointment-detail__content">
          {loading ? (
            <div className="nx-appointment-detail__state" role="status" aria-live="polite">
              <span className="nx-appointment-detail__state-icon" aria-hidden="true">⏳</span>
              <span className="nx-appointment-detail__state-copy">
                <strong>Cargando turno...</strong>
                <span>Estamos preparando el resumen de la cita.</span>
              </span>
            </div>
          ) : null}
          {error ? (
            <div className="nx-appointment-detail__state nx-appointment-detail__state--error" role="alert">
              <span className="nx-appointment-detail__state-icon" aria-hidden="true">!</span>
              <span className="nx-appointment-detail__state-copy">
                <strong>No pudimos cargar el detalle del turno.</strong>
                <span>{error}</span>
              </span>
            </div>
          ) : null}

          {appointment ? (
            <>
              <dl className="nx-appointment-detail__summary" aria-label="Resumen del turno">
                <div className="nx-appointment-detail__item">
                  <dt className="nx-appointment-detail__label">Paciente</dt>
                  <dd className="nx-appointment-detail__value">{getAppointmentPatientName(appointment)}</dd>
                </div>
                <div className="nx-appointment-detail__item">
                  <dt className="nx-appointment-detail__label">Fecha</dt>
                  <dd className="nx-appointment-detail__value">{formatArgentinaDate(appointment.startAt)}</dd>
                </div>
                <div className="nx-appointment-detail__item">
                  <dt className="nx-appointment-detail__label">Inicio</dt>
                  <dd className="nx-appointment-detail__value">{formatArgentinaTime(appointment.startAt)}</dd>
                </div>
                <div className="nx-appointment-detail__item">
                  <dt className="nx-appointment-detail__label">Fin</dt>
                  <dd className="nx-appointment-detail__value">{formatArgentinaTime(appointment.endAt)}</dd>
                </div>
              </dl>

              <div className="nx-appointment-detail__actions">
                <button
                  type="button"
                  className="nx-appointment-detail__patient-button"
                  disabled={!appointment.patientProfileId || loadingPatientDetail}
                  onClick={() => void openPatientDetail()}
                >
                  {loadingPatientDetail ? (
                    <span className="nx-appointment-detail__loading-dot" aria-hidden="true" />
                  ) : (
                    <span className="nx-appointment-detail__button-icon" aria-hidden="true">👤</span>
                  )}
                  {loadingPatientDetail ? 'Cargando datos...' : 'Datos del paciente'}
                </button>
                {!appointment.patientProfileId ? (
                  <div className="nx-appointment-detail__notice" role="note">
                    <span className="nx-appointment-detail__notice-icon" aria-hidden="true">i</span>
                    <span className="nx-appointment-detail__notice-copy">
                      <strong>Perfil no vinculado</strong>
                      <span>Este turno no tiene un perfil de paciente vinculado.</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </Card>
      <PatientDetailModal patient={selectedPatient} isOpen={isPatientModalOpen} loading={loadingPatientDetail} error={patientDetailError} onClose={closePatientDetail} />
    </main>
  );
};
