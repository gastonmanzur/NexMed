import type { AppointmentDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useAuth } from '../auth/AuthContext';
import { professionalApi } from './professional-api';

export const ProfessionalPatientsPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;
    void (async () => {
      setLoading(true);
      try {
        setAppointments(await professionalApi.appointments(accessToken, activeOrganizationId));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los pacientes del profesional');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, activeOrganizationId]);

  const patients = useMemo(() => Array.from(new Map(appointments.map((appointment) => [appointment.patientName, appointment])).values()), [appointments]);

  if (loading) return <LoadingState message="Cargando pacientes..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="professional-dashboard">
      <div className="pro-hero"><div><span>Panel profesional</span><h1>Pacientes</h1><p>Acá vas a ver los pacientes atendidos o asignados a tu agenda.</p></div><div className="pro-hero__status">{patients.length} vinculados</div></div>
      <section className="pro-panel">
        <header className="pro-section-header"><div><span>Agenda profesional</span><h2>Pacientes relacionados</h2></div><span>{patients.length} registros</span></header>
        {patients.length ? <div className="pro-agenda-list">{patients.map((appointment) => <div className="pro-agenda-row" key={`${appointment.id}-${appointment.patientName}`}><strong>Paciente</strong><span>{appointment.patientName}</span><em className={`pro-status pro-status--${appointment.status}`}>{appointment.status}</em></div>)}</div> : <div className="pro-empty"><strong>Pacientes</strong><p>Acá vas a ver los pacientes atendidos o asignados a tu agenda.</p></div>}
      </section>
    </section>
  );
};
