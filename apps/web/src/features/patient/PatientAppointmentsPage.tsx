import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PatientAppointmentListItemDto, PatientAppointmentScope } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';
import { formatArgentinaDate, formatArgentinaTimeRange } from '../../lib/argentina-date-time';

type TabScope = Extract<PatientAppointmentScope, 'upcoming' | 'past' | 'cancelled'>;

const emptyCopy: Record<TabScope, { title: string; description: string }> = {
  upcoming: { title: 'No tenés próximos turnos.', description: 'Cuando reserves uno, aparecerá en esta sección.' },
  past: { title: 'Todavía no tenés turnos anteriores.', description: 'Acá vas a ver tus turnos ya atendidos o cerrados.' },
  cancelled: { title: 'No tenés turnos cancelados.', description: 'Los turnos cancelados aparecerán en esta sección.' }
};

const downloadIcs = (appointment: PatientAppointmentListItemDto): void => {
  const formatIcsDate = (iso: string): string => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const summary = `Turno en ${appointment.organization.name}`;
  const description = `Turno con ${appointment.professional?.fullName ?? 'profesional'}${appointment.specialty?.name ? ` — ${appointment.specialty.name}` : ''}`;
  const location = [appointment.organization.address, appointment.organization.city].filter(Boolean).join(', ');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NexMed//Mis turnos//ES', 'BEGIN:VEVENT', `UID:${appointment.id}@nexmedturnos.pro`, `SUMMARY:${summary}`, `DTSTART:${formatIcsDate(appointment.startAt)}`, `DTEND:${formatIcsDate(appointment.endAt ?? appointment.startAt)}`, `LOCATION:${location}`, `DESCRIPTION:${description}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'turno-nexmed.ics';
  anchor.click();
  URL.revokeObjectURL(url);
};

const PatientAppointmentCard = ({ item, onCancel }: { item: PatientAppointmentListItemDto; onCancel: (item: PatientAppointmentListItemDto) => void }): ReactElement => (
  <article className="nx-appointment-item">
    <div>
      <p className="nx-appointment-item__date">{formatArgentinaDate(item.startAt)} — {formatArgentinaTimeRange(item.startAt, item.endAt ?? item.startAt)}</p>
      <p className="nx-appointment-item__status"><strong>{item.organization.name}</strong>{item.specialty?.name ? ` · ${item.specialty.name}` : item.serviceName ? ` · ${item.serviceName}` : ''}</p>
      <p className="nx-appointment-item__status">Profesional: {item.professional?.fullName ?? 'A confirmar'}</p>
      <p className="nx-appointment-item__status">Estado: {item.patientStatusLabel}</p>
      {item.organization.address ? <p className="nx-appointment-item__status">{item.organization.address}{item.organization.city ? `, ${item.organization.city}` : ''}</p> : null}
    </div>
    <div className="nx-appointment-item__actions">
      <Link className="nx-btn-secondary" to={`/patient/appointments/${item.id}`}>Ver detalles</Link>
      {item.canReschedule ? <Link className="nx-btn-secondary" to={`/patient/appointments/${item.id}/reschedule`}>Reprogramar</Link> : null}
      {item.canCancel ? <button className="nx-btn-secondary" type="button" onClick={() => onCancel(item)}>Cancelar</button> : null}
      <button className="nx-btn-secondary" type="button" onClick={() => downloadIcs(item)}>Agregar al calendario</button>
    </div>
  </article>
);

export const PatientAppointmentsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabScope>('upcoming');
  const [items, setItems] = useState<PatientAppointmentListItemDto[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const tabs = useMemo<Array<{ scope: TabScope; label: string }>>(() => [{ scope: 'upcoming', label: 'Próximos' }, { scope: 'past', label: 'Anteriores' }, { scope: 'cancelled', label: 'Cancelados' }], []);

  const reload = async (scope = activeTab, nextPage = page): Promise<void> => {
    if (!accessToken) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const data = await patientApi.listAppointments(accessToken, { scope, page: nextPage, limit: 10 });
      setItems(data.items); setPages(data.pagination.pages); setPage(data.pagination.page);
    } catch (cause) { setError((cause as Error).message || 'No pudimos cargar tus turnos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(activeTab, 1); }, [accessToken, activeTab]);

  const cancel = async (item: PatientAppointmentListItemDto): Promise<void> => {
    if (!accessToken || !window.confirm('¿Querés cancelar este turno?\nEsta acción puede liberar el horario para otro paciente.')) return;
    setCancellingId(item.id);
    try { await patientApi.cancelAppointment(accessToken, item.id, 'Cancelado por paciente'); setMessage('Turno cancelado.'); await reload(activeTab, page); }
    catch (cause) { setError((cause as Error).message || 'No es posible cancelar este turno.'); }
    finally { setCancellingId(null); }
  };

  return <main className="nx-page nx-page--appointments"><Card title="Mis turnos" subtitle="Consultá y gestioná tus próximos turnos.">
    <div className="nx-tabs" role="tablist" aria-label="Filtrar turnos">{tabs.map((tab) => <button key={tab.scope} type="button" role="tab" aria-selected={activeTab === tab.scope} className={`nx-tab${activeTab === tab.scope ? ' is-active' : ''}`} onClick={() => { setActiveTab(tab.scope); setPage(1); }}>{tab.label}</button>)}</div>
    {loading ? <LoadingState message="Cargando turnos..." /> : null}
    {!loading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
    {message ? <p className="nx-form-success">{message}</p> : null}
    {!loading && !error && items.length === 0 ? <EmptyState title={emptyCopy[activeTab].title} description={emptyCopy[activeTab].description} {...(activeTab === 'upcoming' ? { action: <Link className="nx-btn" to="/patient/organizations">Reservar un turno</Link> } : {})} icon="🗓️" /> : null}
    {!loading && !error && items.length > 0 ? <div className="nx-appointment-list">{items.map((item) => <PatientAppointmentCard key={item.id} item={item} onCancel={cancel} />)}</div> : null}
    {cancellingId ? <p className="nx-appointment-item__status" role="status">Cancelando turno...</p> : null}
    {pages > 1 ? <div className="nx-appointment-item__actions"><button className="nx-btn-secondary" type="button" disabled={page <= 1} onClick={() => void reload(activeTab, page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="nx-btn-secondary" type="button" disabled={page >= pages} onClick={() => void reload(activeTab, page + 1)}>Siguiente</button></div> : null}
  </Card></main>;
};
