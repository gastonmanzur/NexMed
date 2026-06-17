import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import './appointments-detail.css';
import { useAuth } from '../auth/AuthContext';
import { PatientDetailModal } from '../organizations/PatientDetailModal';
import { organizationApi, type InternalMessageDto } from '../organizations/organization-api';
import { InternalMessagesCard } from '../organizations/InternalMessagesCard';
import { appointmentsApi } from './appointments-api';
import type { AppointmentDto, AppointmentNotificationDto, OrganizationPatientDetailDto } from '@starter/shared-types';
import { formatArgentinaDate, formatArgentinaTime } from '../../lib/argentina-date-time';

const notificationTypeLabel = (type: AppointmentNotificationDto['type']): string => {
  switch (type) {
    case 'appointment_confirmation': return 'Confirmación WhatsApp';
    case 'appointment_reminder': return 'Recordatorio WhatsApp';
    case 'appointment_cancellation': return 'Cancelación WhatsApp';
    case 'appointment_rescheduled': return 'Reprogramación WhatsApp';
    default: return 'WhatsApp';
  }
};

const notificationStatusLabel = (status: AppointmentNotificationDto['status']): string => {
  switch (status) {
    case 'sent': return 'enviada';
    case 'pending': return 'pendiente';
    case 'processing': return 'procesando';
    case 'failed': return 'fallida';
    case 'manual_required': return 'manual';
    case 'skipped': return 'omitida';
    case 'cancelled': return 'cancelada';
    default: return status;
  }
};

const getAppointmentPatientName = (appointment: AppointmentDto): string => appointment.beneficiaryDisplayName ?? appointment.patientName;

export const AppointmentDetailPage = (): ReactElement => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, accessToken, activeOrganizationId } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<OrganizationPatientDetailDto | null>(null);
  const [appointmentNotifications, setAppointmentNotifications] = useState<AppointmentNotificationDto[]>([]);
  const [internalMessages, setInternalMessages] = useState<InternalMessageDto[]>([]);
  const [messagesError, setMessagesError] = useState('');
  const [internalMessageText, setInternalMessageText] = useState('');
  const [internalMessageType, setInternalMessageType] = useState('custom');
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
      setAppointmentNotifications(await appointmentsApi.listNotifications(accessToken, activeOrganizationId, appointmentId));
      setMessagesError('');
      setInternalMessages((await organizationApi.listInternalMessages(accessToken, activeOrganizationId, { appointmentId, limit: 20 })).items);
    } catch (cause) {
      setError((cause as Error).message);
      setMessagesError((cause as Error).message);
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

  const sendInternalMessage = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !appointmentId) return;
    try {
      await organizationApi.sendAppointmentInternalMessage(accessToken, activeOrganizationId, appointmentId, { type: internalMessageType, message: internalMessageText });
      setInternalMessageText('');
      await load();
    } catch (cause) {
      setMessagesError((cause as Error).message);
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
                <div className="nx-appointment-detail__item">
                  <dt className="nx-appointment-detail__label">Cobertura</dt>
                  <dd className="nx-appointment-detail__value">{appointment.healthInsuranceName ?? 'Particular'}</dd>
                </div>
                {appointment.insuranceMemberNumber ? (
                  <div className="nx-appointment-detail__item">
                    <dt className="nx-appointment-detail__label">N° afiliado</dt>
                    <dd className="nx-appointment-detail__value">{appointment.insuranceMemberNumber}</dd>
                  </div>
                ) : null}
                {appointment.notes ? (
                  <div className="nx-appointment-detail__item">
                    <dt className="nx-appointment-detail__label">Motivo</dt>
                    <dd className="nx-appointment-detail__value">{appointment.notes}</dd>
                  </div>
                ) : null}
                <div className="nx-appointment-detail__item">
                  <dt className="nx-appointment-detail__label">Origen</dt>
                  <dd className="nx-appointment-detail__value">{appointment.source === 'express_booking' ? 'Reserva express' : appointment.source}</dd>
                </div>
              </dl>


              <section className="nx-appointment-detail__notifications" aria-label="Notificaciones del turno">
                <h3>Notificaciones</h3>
                {appointmentNotifications.length === 0 ? (
                  <p>No hay notificaciones WhatsApp registradas para este turno.</p>
                ) : (
                  <ul>
                    {appointmentNotifications.map((item) => (
                      <li key={item.id}>
                        <strong>{notificationTypeLabel(item.type)}:</strong> {notificationStatusLabel(item.status)}
                        {item.scheduledFor ? ` · programado ${formatArgentinaDate(item.scheduledFor)} ${formatArgentinaTime(item.scheduledFor)}` : ''}
                        {item.sentAt ? ` · enviado ${formatArgentinaDate(item.sentAt)} ${formatArgentinaTime(item.sentAt)}` : ''}
                        {item.error ? ` · ${item.error}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

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
      {accessToken && activeOrganizationId ? <>
        <Card title="Enviar mensaje al profesional" subtitle="Novedad interna asociada a este turno.">
          <div style={{ display: 'grid', gap: '.75rem' }}>
            <select value={internalMessageType} onChange={(event) => setInternalMessageType(event.target.value)}>
              <option value="patient_arrived">Paciente llegó</option>
              <option value="patient_left">Paciente se retiró</option>
              <option value="coverage_issue">Problema de cobertura</option>
              <option value="documentation_request">Documentación</option>
              <option value="payment_request">Cobro</option>
              <option value="custom">Personalizado</option>
            </select>
            <textarea placeholder="Mensaje opcional o personalizado" value={internalMessageText} onChange={(event) => setInternalMessageText(event.target.value)} />
            <button type="button" className="nx-btn-primary" disabled={internalMessageType === 'custom' && !internalMessageText.trim()} onClick={() => void sendInternalMessage()}>Enviar al profesional</button>
          </div>
        </Card>
        <InternalMessagesCard accessToken={accessToken} organizationId={activeOrganizationId} messages={internalMessages} error={messagesError} onRefresh={load} allowReply />
      </> : null}
      <PatientDetailModal patient={selectedPatient} isOpen={isPatientModalOpen} loading={loadingPatientDetail} error={patientDetailError} onClose={closePatientDetail} />
    </main>
  );
};
