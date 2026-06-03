import type { AppointmentDto, AppointmentStatus, ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments-api';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import { resolveAvatarUrl } from '../../lib/resolve-avatar-url';
import './appointments-agenda.css';

const appointmentStatuses: AppointmentStatus[] = ['booked', 'canceled_by_staff', 'canceled_by_patient', 'rescheduled', 'completed', 'no_show'];
const viewModes = ['Semana', 'Día', 'Mes'];
const timeSlots = Array.from({ length: 12 }, (_, hour) => hour + 8);

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
const formatHour = (value: string): string => new Date(value).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const durationMinutes = (startAt: string, endAt: string): number => Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));

const statusTone = (status: AppointmentStatus): string => {
  if (status === 'booked') return 'booked';
  if (status === 'completed') return 'completed';
  if (status === 'rescheduled') return 'rescheduled';
  if (status === 'no_show') return 'no-show';
  return 'canceled';
};

const statusLabel = (status: AppointmentStatus): string => {
  if (status === 'booked') return 'Confirmado';
  if (status === 'completed') return 'Completado';
  if (status === 'rescheduled') return 'Reprogramado';
  if (status === 'no_show') return 'Ausente';
  return 'Cancelado';
};

const avatarFromName = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PR';

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
  const [invalidAvatarUrls, setInvalidAvatarUrls] = useState<Record<string, true>>({});

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.organizationId === activeOrganizationId),
    [activeOrganizationId, memberships]
  );

  const canManage = activeMembership?.role === 'owner' || activeMembership?.role === 'admin' || activeMembership?.role === 'staff';

  const professionalsById = useMemo(() => new Map(professionals.map((item) => [item.id, item])), [professionals]);
  const specialtiesById = useMemo(() => new Map(specialties.map((item) => [item.id, item.name])), [specialties]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekAnchor);
        day.setDate(weekAnchor.getDate() + index);
        return day;
      }),
    [weekAnchor]
  );

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

  useEffect(() => {
    void load();
  }, [accessToken, activeOrganizationId, selectedProfessionalId, selectedStatus, weekAnchor]);

  const byDay = useMemo(
    () =>
      weekDays.map((day) => {
        const key = toLocalDateKey(day);
        return appointments
          .filter((item) => toLocalDateKey(new Date(item.startAt)) === key)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      }),
    [appointments, weekDays]
  );

  const todayIsoKey = toLocalDateKey(new Date());
  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((item) => toLocalDateKey(new Date(item.startAt)) === todayIsoKey)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments, todayIsoKey]
  );

  const weekStartLabel = weekDays.at(0)?.toLocaleDateString('es-AR') ?? '-';
  const weekEndLabel = weekDays.at(-1)?.toLocaleDateString('es-AR') ?? '-';
  const renderProfessionalAvatar = (professional: ProfessionalDto | null): ReactElement => {
    const initials = avatarFromName(professional?.displayName ?? 'PR');
    const rawAvatarUrl = professional?.avatarUrl;
    const avatarUrl = rawAvatarUrl ? resolveAvatarUrl(rawAvatarUrl) : null;

    if (avatarUrl && !invalidAvatarUrls[avatarUrl]) {
      return (
        <img
          src={avatarUrl}
          alt={`Foto de ${professional?.displayName ?? 'profesional'}`}
          className="nx-prof-avatar nx-prof-avatar--image"
          onError={() => setInvalidAvatarUrls((current) => ({ ...current, [avatarUrl]: true }))}
        />
      );
    }

    return <span className="nx-prof-avatar">{initials}</span>;
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;

  return (
    <main className="nx-agenda-page">
      <header>
        <h1>Agenda</h1>
        <p>Semana del {weekStartLabel} al {weekEndLabel}</p>
      </header>

      <section className="nx-agenda-toolbar" aria-label="Filtros de agenda">
        <label className="nx-agenda-toolbar__field">
          <span>Profesional</span>
          <select value={selectedProfessionalId} onChange={(event) => setSelectedProfessionalId(event.target.value)}>
            <option value="">Todos</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="nx-agenda-toolbar__field">
          <span>Estado</span>
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
            <option value="">Todos</option>
            {appointmentStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <div className="nx-agenda-toolbar__range" role="group" aria-label="Rango semanal">
          <button className="nx-agenda-toolbar__ghost-btn" type="button" onClick={() => setWeekAnchor((prev) => {
            const next = new Date(prev);
            next.setDate(next.getDate() - 7);
            return next;
          })}>
            ← Semana anterior
          </button>
          <strong className="nx-agenda-toolbar__range-value">{weekStartLabel} — {weekEndLabel}</strong>
          <button className="nx-agenda-toolbar__ghost-btn" type="button" onClick={() => setWeekAnchor((prev) => {
            const next = new Date(prev);
            next.setDate(next.getDate() + 7);
            return next;
          })}>
            Semana siguiente →
          </button>
        </div>

        <div className="nx-agenda-toolbar__view">
          {viewModes.map((mode) => (
            <button key={mode} type="button" className={`nx-agenda-toolbar__view-btn ${mode === activeViewMode ? 'is-active' : ''}`.trim()} onClick={() => setActiveViewMode(mode)}>
              {mode}
            </button>
          ))}
        </div>

        <div className="nx-agenda-toolbar__actions">
          <button type="button" className="nx-agenda-toolbar__ghost-btn" onClick={() => setWeekAnchor(startOfWeek(new Date()))}>Hoy</button>
          <Link className="nx-agenda-toolbar__primary-link" to="/app/appointments/new" role="button" aria-disabled={!canManage} onClick={(event) => {
            if (!canManage) event.preventDefault();
          }}>
            Nuevo turno
          </Link>
        </div>
      </section>

      {error ? <p className="nx-agenda-error">{error}</p> : null}

      <section className="nx-agenda-layout">
        <article className="nx-agenda-grid-card">
          <header className="nx-agenda-grid-head">
            <span>Horario</span>
            {weekDays.map((day) => {
              const isToday = toLocalDateKey(day) === todayIsoKey;
              return (
                <div key={day.toISOString()} className={isToday ? 'is-today' : undefined}>
                  <p>{formatDayLabel(day)} {isToday ? <span>Hoy</span> : null}</p>
                  <strong>{formatDayNumber(day)}</strong>
                </div>
              );
            })}
          </header>

          <div className="nx-agenda-grid-body" aria-busy={loading}>
            {timeSlots.map((slotHour) => (
              <div className="nx-agenda-row" key={slotHour}>
                <span className="nx-agenda-time">{`${slotHour.toString().padStart(2, '0')}:00`}</span>
                {weekDays.map((day, dayIndex) => {
                  const entries = (byDay[dayIndex] ?? []).filter((appointment) => new Date(appointment.startAt).getHours() === slotHour);
                  const isToday = toLocalDateKey(day) === todayIsoKey;
                  return (
                    <div className={`nx-agenda-cell ${isToday ? 'is-today' : ''}`.trim()} key={`${day.toISOString()}-${slotHour}`}>
                      {entries.map((appointment) => {
                        const isDouble = appointment.durationMultiplier === 2;
                        return (
                        <Link to={`/app/appointments/${appointment.id}`} key={appointment.id} className={`nx-agenda-event nx-agenda-event--${statusTone(appointment.status)} ${isDouble ? 'nx-agenda-event--double' : ''}`.trim()}>
                          <div className="nx-agenda-event__head">
                            <strong>{appointment.patientName}</strong>
                            <span className={`nx-agenda-event__chip nx-agenda-event__chip--${statusTone(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                          </div>
                          <span className="nx-agenda-event__meta">
                            {formatHour(appointment.startAt)} · {durationMinutes(appointment.startAt, appointment.endAt)} min
                            {isDouble ? <b>Turno doble</b> : null}
                          </span>
                          <small>
                            {professionalsById.get(appointment.professionalId)?.displayName ?? 'Profesional no asignado'}
                            {' · '}
                            {(appointment.specialtyId ? specialtiesById.get(appointment.specialtyId) : null) ?? 'Especialidad'}
                          </small>
                        </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </article>

        <aside className="nx-agenda-sidepanel">
          <section className="nx-agenda-sidepanel__card">
            <h3>Hoy</h3>
            <p className="nx-agenda-kpi">{todayAppointments.length} turnos</p>
            <ul>
              {todayAppointments.slice(0, 5).map((appointment) => (
                <li key={appointment.id}>
                  {renderProfessionalAvatar(professionalsById.get(appointment.professionalId) ?? null)}
                  <div>
                    <strong>{appointment.patientName}</strong>
                    <span>{formatHour(appointment.startAt)} · {durationMinutes(appointment.startAt, appointment.endAt)} min</span>
                  </div>
                  <b>{statusLabel(appointment.status)}</b>
                </li>
              ))}
              {todayAppointments.length === 0 ? <li>No hay turnos para hoy.</li> : null}
            </ul>
          </section>

          <section className="nx-agenda-sidepanel__card">
            <h3>Profesionales activos</h3>
            <p className="nx-agenda-kpi">{professionals.length}</p>
            <ul>
              {professionals.slice(0, 5).map((professional) => (
                <li key={professional.id}>
                  {renderProfessionalAvatar(professional)}
                  <div>
                    <strong>{professional.displayName}</strong>
                    <span>{professional.email ?? 'Sin email'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
};
