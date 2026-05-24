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

  const activeMembership = useMemo(() => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null, [activeOrganizationId, memberships]);
  const canManage = activeMembership?.role === 'owner' || activeMembership?.role === 'admin' || activeMembership?.role === 'staff';
  const professionalsById = useMemo(() => new Map(professionals.map((item) => [item.id, item.displayName])), [professionals]);
  const specialtiesById = useMemo(() => new Map(specialties.map((item) => [item.id, item.name])), [specialties]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekAnchor);
    day.setDate(weekAnchor.getDate() + index);
    return day;
  }), [weekAnchor]);

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

  useEffect(() => { void load(); }, [accessToken, activeOrganizationId, weekAnchor]);

  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;

  const byDay = weekDays.map((day) => {
    const key = day.toISOString().slice(0, 10);
    return appointments
      .filter((item) => item.startAt.slice(0, 10) === key)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  });

  const todayAppointments = appointments
    .filter((item) => item.startAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const weekStartLabel = weekDays.at(0)?.toLocaleDateString('es-AR') ?? '-';
  const weekEndLabel = weekDays.at(-1)?.toLocaleDateString('es-AR') ?? '-';

  return (
    <main className="nx-page nx-agenda-page">
      <section className="nx-agenda-hero">
        <div>
          <p className="nx-agenda-hero__eyebrow">Agenda operativa</p>
          <h1>Agenda semanal premium</h1>
          <p>Controlá turnos, profesionales y estado del centro en una vista diseñada para operación real y demos comerciales.</p>
        </div>
        <div className="nx-agenda-hero__actions">
          {canManage ? <Link className="nx-btn" to="/app/appointments/new">+ Nuevo turno</Link> : null}
          <button className="nx-btn-secondary" onClick={() => setWeekAnchor(startOfWeek(new Date()))}>Hoy</button>
        </div>
      </section>

      <section className="nx-agenda-toolbar">
        <label className="nx-field"><span>Profesional</span><select value={selectedProfessionalId} onChange={(e) => setSelectedProfessionalId(e.target.value)}><option value="">Todos</option>{professionals.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select></label>
        <label className="nx-field"><span>Estado</span><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}><option value="">Todos</option>{appointmentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <div className="nx-agenda-toolbar__range">
          <button className="nx-btn-secondary" onClick={() => setWeekAnchor((curr) => { const n = new Date(curr); n.setDate(n.getDate() - 7); return startOfWeek(n); })}>←</button>
          <strong>{weekStartLabel} - {weekEndLabel}</strong>
          <button className="nx-btn-secondary" onClick={() => setWeekAnchor((curr) => { const n = new Date(curr); n.setDate(n.getDate() + 7); return startOfWeek(n); })}>→</button>
        </div>
        <div className="nx-agenda-toolbar__view">
          {viewModes.map((mode) => <button key={mode} className={mode === activeViewMode ? 'is-active' : ''} onClick={() => setActiveViewMode(mode)}>{mode}</button>)}
        </div>
        <button className="nx-btn" onClick={() => void load()} disabled={loading}>Actualizar</button>
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
                    const entries = (byDay[dayIndex] ?? []).filter((item) => new Date(item.startAt).getHours() === slotHour);
                    return (
                      <div className="nx-agenda-cell" key={`${day.toISOString()}-${slotHour}`}>
                        {entries.map((appointment) => (
                          <Link to={`/app/appointments/${appointment.id}`} key={appointment.id} className={`nx-agenda-event nx-agenda-event--${statusTone(appointment.status)}`}>
                            <strong>{appointment.patientName}</strong>
                            <span>{new Date(appointment.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {professionalsById.get(appointment.professionalId) ?? 'Profesional'}</span>
                            <small>{appointment.specialtyId ? specialtiesById.get(appointment.specialtyId) ?? 'Especialidad' : 'Consulta general'} · {appointment.status}</small>
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
          <section>
            <h3>Equipo activo</h3>
            <ul>{professionals.slice(0, 6).map((p) => <li key={p.id}><strong>{p.displayName}</strong><span>{p.email || 'Disponible'}</span></li>)}</ul>
          </section>
          <section>
            <h3>Hoy</h3>
            <p className="nx-agenda-kpi">{todayAppointments.length} turnos</p>
            <ul>{todayAppointments.slice(0, 5).map((a) => <li key={a.id}><strong>{a.patientName}</strong><span>{new Date(a.startAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {a.status}</span></li>)}</ul>
          </section>
          <section>
            <h3>Estado operativo</h3>
            <div className="nx-agenda-status-row"><span>Confirmados</span><b>{appointments.filter((a) => a.status === 'booked').length}</b></div>
            <div className="nx-agenda-status-row"><span>Completados</span><b>{appointments.filter((a) => a.status === 'completed').length}</b></div>
            <div className="nx-agenda-status-row"><span>Reprogramados</span><b>{appointments.filter((a) => a.status === 'rescheduled').length}</b></div>
          </section>
        </aside>
      </section>
    </main>
  );
};
