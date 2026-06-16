import type { AppointmentDto, ProfessionalDashboardDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useAuth } from '../auth/AuthContext';
import { professionalApi } from './professional-api';

const time = (value: string): string => new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

const coverage = (appointment: AppointmentDto): string => appointment.paymentCoverageType === 'health_insurance'
  ? `${appointment.healthInsuranceName ?? 'Obra social'}${appointment.insurancePlan ? ` / ${appointment.insurancePlan}` : ''}`
  : 'Particular';

const statusLabel: Record<AppointmentDto['status'], string> = {
  booked: 'Reservado',
  confirmed_by_patient: 'Confirmado',
  arrived: 'Llegó',
  completed: 'Atendido',
  no_show: 'No asistió',
  canceled_by_patient: 'Cancelado por paciente',
  canceled_by_staff: 'Cancelado por staff',
  rescheduled: 'Reprogramado'
};

const AppointmentCard = ({ appointment, primary = false }: { appointment: AppointmentDto; primary?: boolean }): ReactElement => (
  <article className={primary ? 'pro-appointment pro-appointment--primary' : 'pro-appointment'}>
    <div>
      <strong>{appointment.patientName}</strong>
      <span>{coverage(appointment)}</span>
    </div>
    <div>
      <span>Turno</span>
      <strong>{time(appointment.startAt)}</strong>
    </div>
    <div>
      <span>Estado</span>
      <strong className={`pro-status pro-status--${appointment.status}`}>{statusLabel[appointment.status]}</strong>
    </div>
    {appointment.notes ? <p>{appointment.notes}</p> : null}
    <footer>
      <button type="button" disabled>Iniciar atención</button>
      <button type="button" disabled>Ver historia</button>
      <button type="button" disabled>Avisar demora</button>
      <button type="button" disabled>Mensaje a secretaría</button>
    </footer>
  </article>
);

export const ProfessionalDashboardPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [dashboard, setDashboard] = useState<ProfessionalDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;

    let alive = true;
    const load = async (silent = false): Promise<void> => {
      if (!silent) setLoading(true);
      try {
        const data = await professionalApi.dashboard(accessToken, activeOrganizationId);
        if (!alive) return;
        setDashboard(data);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el panel profesional');
      } finally {
        if (alive && !silent) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(true), 15000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [accessToken, activeOrganizationId]);

  const waitingRoom = dashboard?.waitingRoom ?? [];
  const appointments = dashboard?.todayAppointments ?? [];
  const professionalName = useMemo(() => {
    const professional = dashboard?.me.professional;
    return professional?.displayName ?? (professional ? `${professional.firstName} ${professional.lastName}` : 'Profesional');
  }, [dashboard]);

  if (loading) return <LoadingState message="Cargando panel profesional..." />;
  if (error) return <ErrorState message={error} />;
  if (!dashboard) return <ErrorState message="No hay datos disponibles para el panel profesional." />;

  return (
    <section className="professional-dashboard">
      <div className="pro-hero">
        <div>
          <span>Inicio profesional</span>
          <h1>Hola Dr./Dra. {professionalName}</h1>
          <p>{dashboard.me.organizationName} · {new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(new Date(dashboard.today))}</p>
        </div>
        <div className="pro-hero__status">Operativo</div>
      </div>

      <div className="pro-stats">
        <article><span>Sala de espera</span><strong>{dashboard.stats.waiting}</strong></article>
        <article><span>Pendientes hoy</span><strong>{dashboard.stats.pendingToday}</strong></article>
        <article><span>Finalizadas</span><strong>{dashboard.stats.completedToday}</strong></article>
        <article><span>No asistió</span><strong>{dashboard.stats.noShowToday}</strong></article>
      </div>

      <div className="pro-grid">
        <section className="pro-panel">
          <header><h2>Sala de espera</h2><span>Polling cada 15s</span></header>
          {waitingRoom.length > 0 ? waitingRoom.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />) : (
            <div className="pro-empty">
              <strong>No hay pacientes en sala de espera.</strong>
              <p>Cuando secretaría marque “Llegó”, aparecerán acá.</p>
            </div>
          )}
        </section>

        <section className="pro-panel pro-panel--focus">
          <header><h2>Próximo paciente</h2><span>{dashboard.nextAppointment ? time(dashboard.nextAppointment.startAt) : 'Sin espera'}</span></header>
          {dashboard.nextAppointment ? <AppointmentCard appointment={dashboard.nextAppointment} primary /> : (
            <div className="pro-empty">
              <strong>No hay próximos pacientes pendientes.</strong>
              <p>La agenda del día se actualizará automáticamente.</p>
            </div>
          )}
        </section>

        <section className="pro-panel">
          <header><h2>Agenda del día</h2><span>{appointments.length} turnos</span></header>
          <div className="pro-agenda-list">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="pro-agenda-row">
                <strong>{time(appointment.startAt)}</strong>
                <span>{appointment.patientName}</span>
                <em className={`pro-status pro-status--${appointment.status}`}>{statusLabel[appointment.status]}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};
