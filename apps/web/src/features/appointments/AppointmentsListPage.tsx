import type { AppointmentDto, AppointmentStatus, ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments-api';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import { resolveAvatarUrl } from '../../lib/resolve-avatar-url';
import {
  formatArgentinaDate,
  formatArgentinaTime,
  formatArgentinaTimeRange,
  getArgentinaDateKey,
  getArgentinaDateRangeIso,
  getArgentinaWeekDateKeys
} from '../../lib/argentina-date-time';
import { appointmentStatuses, centerStatusActions, isPendingClosure, statusLabel, statusTone } from './appointment-status';
import './appointments-agenda.css';


const viewModes = ['Semana', 'Día', 'Mes'];
const timeSlots = Array.from({ length: 12 }, (_, hour) => hour + 8);

const formatDayLabel = (dateKey: string): string =>
  new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00.000Z`));
const formatDayNumber = (dateKey: string): string =>
  new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00.000Z`));
const durationMinutes = (startAt: string, endAt: string): number => Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
const getAppointmentPatientName = (appointment: AppointmentDto): string => appointment.beneficiaryDisplayName ?? appointment.patientName;
const getAppointmentSlotGroupKey = (appointment: AppointmentDto): string =>
  `${getArgentinaDateKey(appointment.startAt)}-${formatArgentinaTime(appointment.startAt)}`;

type SelectedAppointmentGroup = {
  groupKey: string;
  day: string;
  time: string;
  appointments: AppointmentDto[];
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
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [invalidAvatarUrls, setInvalidAvatarUrls] = useState<Record<string, true>>({});
  const [updatingStatusId, setUpdatingStatusId] = useState('');
  const [selectedAppointmentGroup, setSelectedAppointmentGroup] = useState<SelectedAppointmentGroup | null>(null);
  const groupModalCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeMembership = useMemo(
    () => memberships.find((membership) => membership.organizationId === activeOrganizationId),
    [activeOrganizationId, memberships]
  );

  const canManage = activeMembership?.role === 'owner' || activeMembership?.role === 'admin' || activeMembership?.role === 'staff';

  const professionalsById = useMemo(() => new Map(professionals.map((item) => [item.id, item])), [professionals]);
  const specialtiesById = useMemo(() => new Map(specialties.map((item) => [item.id, item.name])), [specialties]);

  const weekDays = useMemo(() => getArgentinaWeekDateKeys(weekAnchor), [weekAnchor]);

  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;

    setLoading(true);
    setError('');

    try {
      const { from, to } = getArgentinaDateRangeIso(weekDays[0]!, weekDays[6]!);

      const [appointmentsData, professionalsData, specialtiesData] = await Promise.all([
        appointmentsApi.list(accessToken, activeOrganizationId, {
          ...(selectedProfessionalId ? { professionalId: selectedProfessionalId } : {}),
          ...(selectedStatus ? { status: selectedStatus as AppointmentStatus } : {}),
          from,
          to
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
        const key = day;
        return appointments
          .filter((item) => getArgentinaDateKey(item.startAt) === key)
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      }),
    [appointments, weekDays]
  );

  const todayIsoKey = getArgentinaDateKey(new Date());
  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((item) => getArgentinaDateKey(item.startAt) === todayIsoKey)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments, todayIsoKey]
  );

  const weekStartLabel = weekDays.at(0) ? formatArgentinaDate(`${weekDays[0]}T12:00:00`) : '-';
  const weekEndLabel = weekDays.at(-1) ? formatArgentinaDate(`${weekDays[6]}T12:00:00`) : '-';

  useEffect(() => {
    if (!selectedAppointmentGroup) return;

    const appointmentIds = new Set(selectedAppointmentGroup.appointments.map((appointment) => appointment.id));
    const refreshedAppointments = appointments
      .filter((appointment) => appointmentIds.has(appointment.id))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    if (refreshedAppointments.length === 0) {
      setSelectedAppointmentGroup(null);
      return;
    }

    const hasChanged =
      refreshedAppointments.length !== selectedAppointmentGroup.appointments.length ||
      refreshedAppointments.some((appointment, index) => appointment !== selectedAppointmentGroup.appointments[index]);

    if (hasChanged) {
      setSelectedAppointmentGroup({
        ...selectedAppointmentGroup,
        appointments: refreshedAppointments,
        day: getArgentinaDateKey(refreshedAppointments[0]!.startAt),
        time: formatArgentinaTime(refreshedAppointments[0]!.startAt)
      });
    }
  }, [appointments, selectedAppointmentGroup]);

  useEffect(() => {
    if (!selectedAppointmentGroup) return;

    groupModalCloseButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSelectedAppointmentGroup(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedAppointmentGroup]);

  const openAppointmentGroup = (groupKey: string, appointmentsInSlot: AppointmentDto[]): void => {
    const firstAppointment = appointmentsInSlot[0];
    if (!firstAppointment) return;

    setSelectedAppointmentGroup({
      groupKey,
      day: getArgentinaDateKey(firstAppointment.startAt),
      time: formatArgentinaTime(firstAppointment.startAt),
      appointments: appointmentsInSlot
    });
  };

  const closeAppointmentGroup = (): void => {
    setSelectedAppointmentGroup(null);
  };

  const renderAppointmentCard = (appointment: AppointmentDto, className = ''): ReactElement => {
    const isDouble = appointment.durationMultiplier === 2;
    const pendingClosure = isPendingClosure(appointment.status, appointment.endAt);
    const actions = centerStatusActions(appointment.status);

    return (
      <article
        key={appointment.id}
        className={`nx-agenda-event nx-agenda-event--${statusTone(appointment.status)} ${isDouble ? 'nx-agenda-event--double' : ''} ${pendingClosure ? 'nx-agenda-event--pending-closure' : ''} ${className}`.trim()}
      >
        <Link to={`/app/appointments/${appointment.id}`} className="nx-agenda-event__link">
          <div className="nx-agenda-event__head">
            <strong>{getAppointmentPatientName(appointment)}</strong>
            <span className={`nx-agenda-event__chip nx-agenda-event__chip--${statusTone(appointment.status)}`}>{statusLabel(appointment.status)}</span>
          </div>
          <span className="nx-agenda-event__meta">
            {formatArgentinaTimeRange(appointment.startAt, appointment.endAt)} · {durationMinutes(appointment.startAt, appointment.endAt)} min
            {isDouble ? <b>Turno doble</b> : null}
          </span>
          <small>
            {professionalsById.get(appointment.professionalId)?.displayName ?? 'Profesional no asignado'}
            {' · '}
            {(appointment.specialtyId ? specialtiesById.get(appointment.specialtyId) : null) ?? 'Especialidad'}
          </small>
          {pendingClosure ? <span className="nx-agenda-event__pending">Pendiente de cierre</span> : null}
        </Link>
        {canManage && actions.length > 0 ? (
          <div className="nx-agenda-event__actions">
            {actions.map((action) => (
              <button
                key={action.status}
                type="button"
                disabled={updatingStatusId === appointment.id}
                onClick={() => void updateAppointmentStatus(appointment, action.status, action.note)}
              >
                {pendingClosure && action.status === 'completed' ? 'Marcar atendido' : pendingClosure && action.status === 'no_show' ? 'Marcar no asistió' : action.label}
              </button>
            ))}
          </div>
        ) : null}
      </article>
    );
  };

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


  const updateAppointmentStatus = async (appointment: AppointmentDto, status: AppointmentStatus, note?: string): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setUpdatingStatusId(appointment.id);
    setError('');
    try {
      await appointmentsApi.updateStatus(accessToken, activeOrganizationId, appointment.id, { status, ...(note ? { note } : {}) });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setUpdatingStatusId('');
    }
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
          <button type="button" className="nx-agenda-toolbar__ghost-btn" onClick={() => setWeekAnchor(new Date())}>Hoy</button>
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
              const isToday = day === todayIsoKey;
              return (
                <div key={day} className={isToday ? 'is-today' : undefined}>
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
                  const entries = (byDay[dayIndex] ?? []).filter((appointment) => Number(formatArgentinaTime(appointment.startAt).slice(0, 2)) === slotHour);
                  const groupedEntries = Array.from(
                    entries.reduce<Map<string, AppointmentDto[]>>((groups, appointment) => {
                      const groupKey = getAppointmentSlotGroupKey(appointment);
                      groups.set(groupKey, [...(groups.get(groupKey) ?? []), appointment]);
                      return groups;
                    }, new Map())
                  ).sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey));
                  const isToday = day === todayIsoKey;
                  return (
                    <div className={`nx-agenda-cell ${isToday ? 'is-today' : ''}`.trim()} key={`${day}-${slotHour}`}>
                      {groupedEntries.map(([groupKey, appointmentsInSlot]) => {
                        if (appointmentsInSlot.length === 1) {
                          return renderAppointmentCard(appointmentsInSlot[0]!);
                        }

                        const isSelectedGroup = selectedAppointmentGroup?.groupKey === groupKey;
                        const slotTime = formatArgentinaTime(appointmentsInSlot[0]!.startAt);

                        return (
                          <section className="nx-agenda-slot-group" key={groupKey} aria-label={`${appointmentsInSlot.length} turnos a las ${slotTime}`}>
                            <button
                              type="button"
                              className="nx-agenda-slot-group__summary nx-appointment-group-trigger"
                              aria-haspopup="dialog"
                              aria-expanded={isSelectedGroup}
                              onClick={() => openAppointmentGroup(groupKey, appointmentsInSlot)}
                            >
                              <span className="nx-agenda-slot-group__count">{appointmentsInSlot.length} turnos</span>
                              <span className="nx-agenda-slot-group__hint">Mismo horario · Ver detalle</span>
                              <span className="nx-agenda-slot-group__chevron" aria-hidden="true">↗</span>
                            </button>
                          </section>
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
                    <strong>{getAppointmentPatientName(appointment)}</strong>
                    <span>{formatArgentinaTimeRange(appointment.startAt, appointment.endAt)} · {durationMinutes(appointment.startAt, appointment.endAt)} min</span>
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

      {selectedAppointmentGroup ? (
        <div className="nx-appointment-group-modal" role="presentation">
          <button
            type="button"
            className="nx-appointment-group-modal__overlay"
            aria-label="Cerrar detalle de turnos agrupados"
            onClick={closeAppointmentGroup}
          />
          <section
            className="nx-appointment-group-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-group-modal-title"
            aria-describedby="appointment-group-modal-description"
          >
            <header className="nx-appointment-group-modal__header">
              <div>
                <p className="nx-appointment-group-modal__eyebrow">{selectedAppointmentGroup.appointments.length} turnos</p>
                <h2 id="appointment-group-modal-title">Turnos del mismo horario</h2>
                <p id="appointment-group-modal-description">
                  {formatArgentinaDate(`${selectedAppointmentGroup.day}T12:00:00`)} · {selectedAppointmentGroup.time} hs
                </p>
              </div>
              <button
                ref={groupModalCloseButtonRef}
                type="button"
                className="nx-appointment-group-modal__close"
                aria-label="Cerrar ventana de turnos agrupados"
                onClick={closeAppointmentGroup}
              >
                ×
              </button>
            </header>
            <div className="nx-appointment-group-modal__grid">
              {selectedAppointmentGroup.appointments.map((appointment) => renderAppointmentCard(appointment, 'nx-appointment-group-card'))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
};
