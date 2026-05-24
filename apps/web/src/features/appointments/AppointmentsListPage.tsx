import type { AppointmentDto, AppointmentStatus, ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments-api';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import './appointments-agenda.css';

const appointmentStatuses: AppointmentStatus[] = ['booked', 'canceled_by_staff', 'canceled_by_patient', 'rescheduled', 'completed', 'no_show'];
const viewModes = ['Semana', 'Día', 'Mes'];

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDayLabel = (date: Date): string => date.toLocaleDateString('es-AR', { weekday: 'short' });
const formatDayNumber = (date: Date): string => date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });


const statusTone = (status: AppointmentStatus): string => {
  if (status === 'booked') return 'booked';
  if (status === 'completed') return 'completed';
  if (status === 'rescheduled') return 'rescheduled';
  if (status === 'no_show') return 'no-show';
  return 'canceled';
};


export const AppointmentsListPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId, memberships } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeViewMode, setActiveViewMode] = useState('Semana');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));


  const canManage = activeMembership?.role === 'owner' || activeMembership?.role === 'admin' || activeMembership?.role === 'staff';
  const professionalsById = useMemo(() => new Map(professionals.map((item) => [item.id, item.displayName])), [professionals]);
  const specialtiesById = useMemo(() => new Map(specialties.map((item) => [item.id, item.name])), [specialties]);



  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    setError('');

    try {
      const from = new Date(weekAnchor);
      const to = new Date(weekAnchor);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);

      const [appointmentsData, professionalsData, specialtiesData] = await Promise.all([
        appointmentsApi.list(accessToken, activeOrganizationId, {
          ...(selectedProfessionalId ? { professionalId: selectedProfessionalId } : {}),
          ...(selectedStatus ? { status: selectedStatus as AppointmentStatus } : {}),
          from: from.toISOString(),
          to: to.toISOString()
        }),
        professionalsApi.list(accessToken, activeOrganizationId),
        specialtiesApi.list(accessToken, activeOrganizationId)
      ]);
      setAppointments(appointmentsData);
      setProfessionals(professionalsData);
      setSpecialties(specialtiesData);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };



  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;

  const byDay = weekDays.map((day) => {
    const key = day.toISOString().slice(0, 10);
    return appointments
      .filter((item) => item.startAt.slice(0, 10) === key)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  });


    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const weekStartLabel = weekDays.at(0)?.toLocaleDateString('es-AR') ?? '-';
  const weekEndLabel = weekDays.at(-1)?.toLocaleDateString('es-AR') ?? '-';


      </section>

      {error ? <p className="nx-agenda-error">{error}</p> : null}

      <section className="nx-agenda-layout">
        <article className="nx-agenda-grid-card">
          <header className="nx-agenda-grid-head">
            <span>Horario</span>
            {weekDays.map((day) => <div key={day.toISOString()}><p>{formatDayLabel(day)}</p><strong>{formatDayNumber(day)}</strong></div>)}
          </header>
          <div className="nx-agenda-grid-body">
            {Array.from({ length: 12 }, (_, hour) => {
              const slotHour = hour + 8;
              return (
                <div className="nx-agenda-row" key={slotHour}>
                  <span className="nx-agenda-time">{`${slotHour.toString().padStart(2, '0')}:00`}</span>
                  {weekDays.map((day, dayIndex) => {

                    return (
                      <div className="nx-agenda-cell" key={`${day.toISOString()}-${slotHour}`}>
                        {entries.map((appointment) => (
                          <Link to={`/app/appointments/${appointment.id}`} key={appointment.id} className={`nx-agenda-event nx-agenda-event--${statusTone(appointment.status)}`}>

                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </article>

        <aside className="nx-agenda-sidepanel">

          </section>
        </aside>
      </section>
    </main>
  );
};
