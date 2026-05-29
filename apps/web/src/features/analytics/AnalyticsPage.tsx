import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnalyticsSummaryDto, ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import { useAuth } from '../auth/AuthContext';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import { analyticsApi } from './analytics-api';
import './analytics.css';

const rangeOptions = [
  { id: 'today', label: 'Hoy' },
  { id: 'last7', label: 'Últimos 7 días' },
  { id: 'last30', label: 'Últimos 30 días' },
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'prevMonth', label: 'Mes anterior' },
  { id: 'custom', label: 'Personalizado' }
] as const;

type RangeId = (typeof rangeOptions)[number]['id'];
type StatusBreakdownKey = keyof AnalyticsSummaryDto['statusBreakdown'];

const statusLabels: Record<StatusBreakdownKey, string> = {
  booked: 'Confirmados',
  completed: 'Completados',
  canceledByStaff: 'Cancelados por el centro',
  canceledByPatient: 'Cancelados por pacientes',
  rescheduled: 'Reprogramados',
  noShow: 'Ausentes'
};

const statusColors: Record<StatusBreakdownKey, string> = {
  booked: '#2563eb',
  completed: '#10b981',
  canceledByStaff: '#f97316',
  canceledByPatient: '#ef4444',
  rescheduled: '#8b5cf6',
  noShow: '#64748b'
};

const formatDate = (value: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(new Date(value));
const formatFullDate = (value: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatNumber = (value: number) => new Intl.NumberFormat('es-AR').format(value);

const getComputedRange = (range: RangeId, from: string, to: string) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'last7') {
    start = new Date(now.getTime() - 6 * 86400000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'last30') {
    start = new Date(now.getTime() - 29 * 86400000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'thisMonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'prevMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  if (range === 'custom' && from && to) {
    return { from: new Date(`${from}T00:00:00.000`).toISOString(), to: new Date(`${to}T23:59:59.999`).toISOString() };
  }

  return { from: start.toISOString(), to: end.toISOString() };
};

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="nx-analytics-empty">
    <span className="nx-analytics-empty__icon" aria-hidden="true">◇</span>
    <div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  </div>
);

const MetricSkeleton = () => (
  <main className="nx-analytics-page" aria-busy="true">
    <section className="nx-analytics-hero nx-analytics-skeleton-block" />
    <section className="nx-analytics-toolbar nx-analytics-skeleton-block" />
    <section className="nx-analytics-kpi-grid">
      {Array.from({ length: 8 }).map((_, index) => <article className="nx-analytics-kpi nx-analytics-kpi--loading" key={index} />)}
    </section>
    <section className="nx-analytics-grid nx-analytics-grid--charts">
      <article className="nx-analytics-card nx-analytics-skeleton-block" />
      <article className="nx-analytics-card nx-analytics-skeleton-block" />
    </section>
  </main>
);

export const AnalyticsPage = () => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [data, setData] = useState<AnalyticsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<RangeId>('last30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);

  const computedRange = useMemo(() => getComputedRange(range, from, to), [range, from, to]);
  const activeRangeLabel = useMemo(() => `${formatFullDate(computedRange.from)} al ${formatFullDate(computedRange.to)}`, [computedRange]);
  const activeFilterCount = [professionalId, specialtyId].filter(Boolean).length + (range === 'custom' ? 1 : 0);

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;

    void Promise.all([
      professionalsApi.list(accessToken, activeOrganizationId).then(setProfessionals),
      specialtiesApi.list(accessToken, activeOrganizationId).then(setSpecialties)
    ]).catch(() => {
      setProfessionals([]);
      setSpecialties([]);
    });
  }, [accessToken, activeOrganizationId]);

  const loadMetrics = useCallback(async () => {
    if (!accessToken || !activeOrganizationId) return;

    setLoading(true);
    setError('');

    try {
      const summary = await analyticsApi.summary(accessToken, activeOrganizationId, {
        from: computedRange.from,
        to: computedRange.to,
        ...(professionalId ? { professionalId } : {}),
        ...(specialtyId ? { specialtyId } : {})
      });
      setData(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar las métricas. Intentá nuevamente en unos segundos.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeOrganizationId, computedRange, professionalId, specialtyId]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const kpis = useMemo(() => {
    if (!data) return [];

    return [
      { label: 'Turnos totales', value: formatNumber(data.kpis.totalAppointments), detail: 'Volumen del período seleccionado', icon: '▦', tone: 'blue' },
      { label: 'Confirmados', value: formatNumber(data.kpis.bookedAppointments), detail: 'Turnos reservados activos', icon: '✓', tone: 'cyan' },
      { label: 'Completados', value: formatNumber(data.kpis.completedAppointments), detail: 'Atenciones finalizadas', icon: '●', tone: 'green' },
      { label: 'Cancelados', value: formatNumber(data.kpis.canceledAppointments), detail: `${formatPercent(data.kpis.cancellationRate)} de cancelación`, icon: '!', tone: 'orange' },
      { label: 'Reprogramados', value: formatNumber(data.kpis.rescheduledAppointments), detail: `${formatPercent(data.kpis.rescheduleRate)} sobre el total`, icon: '↻', tone: 'violet' },
      { label: 'Pacientes atendidos', value: formatNumber(data.kpis.uniqueAttendedPatients), detail: `${formatNumber(data.kpis.newPatients)} nuevos · ${formatNumber(data.kpis.recurringPatients)} recurrentes`, icon: '◎', tone: 'teal' },
      { label: 'Próximos turnos', value: formatNumber(data.kpis.upcomingAppointments), detail: 'Reservas futuras dentro del rango', icon: '→', tone: 'slate' },
      { label: 'Recordatorios enviados', value: formatNumber(data.kpis.remindersSent), detail: `${formatNumber(data.kpis.notificationsSent)} notificaciones registradas`, icon: '✦', tone: 'indigo' }
    ];
  }, [data]);

  if (loading && !data) return <MetricSkeleton />;

  if (error && !data) {
    return (
      <main className="nx-analytics-page">
        <section className="nx-analytics-error" role="alert">
          <span aria-hidden="true">!</span>
          <div>
            <h1>No pudimos cargar las métricas</h1>
            <p>{error || 'Intentá nuevamente en unos segundos.'}</p>
            <button className="nx-analytics-primary-btn" type="button" onClick={() => void loadMetrics()}>Reintentar</button>
          </div>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="nx-analytics-page">
        <EmptyState title="Todavía no hay métricas disponibles" description="Cuando empieces a gestionar turnos, este panel mostrará indicadores del centro." />
      </main>
    );
  }

  const statusEntries = (Object.entries(data.statusBreakdown) as Array<[StatusBreakdownKey, number]>).filter(([, count]) => count > 0);
  const maxProfessional = Math.max(1, ...data.byProfessional.map((item) => item.count));
  const maxSpecialty = Math.max(1, ...data.bySpecialty.map((item) => item.count));
  const maxDaily = Math.max(1, ...data.timelineDaily.map((item) => item.count));
  const hasActivity = data.kpis.totalAppointments > 0;
  const donutGradient = statusEntries.length > 0
    ? statusEntries.reduce<{ parts: string[]; current: number }>((acc, [key, count]) => {
      const start = acc.current;
      const end = start + (count / data.kpis.totalAppointments) * 100;
      acc.parts.push(`${statusColors[key]} ${start}% ${end}%`);
      acc.current = end;
      return acc;
    }, { parts: [], current: 0 }).parts.join(', ')
    : '#e2e8f0 0% 100%';

  return (
    <main className="nx-analytics-page">
      <section className="nx-analytics-hero">
        <div>
          <span className="nx-analytics-eyebrow">Analytics operativo</span>
          <h1>Métricas</h1>
          <p>Analizá la actividad del centro, el volumen de turnos y el rendimiento operativo en un solo lugar.</p>
        </div>
        <aside className="nx-analytics-period-card" aria-label="Período activo">
          <span>Período activo</span>
          <strong>{activeRangeLabel}</strong>
          <small>{activeFilterCount ? `${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} aplicado${activeFilterCount > 1 ? 's' : ''}` : 'Sin filtros adicionales'}</small>
        </aside>
      </section>

      <section className="nx-analytics-toolbar" aria-label="Filtros de métricas">
        <div className="nx-analytics-segmented" role="group" aria-label="Rango rápido">
          {rangeOptions.map((option) => (
            <button className={range === option.id ? 'is-active' : ''} key={option.id} type="button" onClick={() => setRange(option.id)}>
              {option.label}
            </button>
          ))}
        </div>

        <div className="nx-analytics-filters">
          {range === 'custom' ? (
            <>
              <label>
                <span>Desde</span>
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label>
                <span>Hasta</span>
                <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </label>
            </>
          ) : null}
          <label>
            <span>Profesional</span>
            <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
              <option value="">Todos los profesionales</option>
              {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.displayName}</option>)}
            </select>
          </label>
          <label>
            <span>Especialidad</span>
            <select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
              <option value="">Todas las especialidades</option>
              {specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
            </select>
          </label>
          <button className="nx-analytics-secondary-btn" type="button" onClick={() => { setProfessionalId(''); setSpecialtyId(''); setRange('last30'); setFrom(''); setTo(''); }}>
            Limpiar filtros
          </button>
        </div>
      </section>

      {error ? (
        <div className="nx-analytics-inline-error" role="alert">
          <span>No pudimos actualizar las métricas.</span>
          <button type="button" onClick={() => void loadMetrics()}>Reintentar</button>
        </div>
      ) : null}

      {!hasActivity ? (
        <EmptyState title="Todavía no hay actividad suficiente para generar métricas" description="Cuando empieces a gestionar turnos, este panel mostrará indicadores del centro con datos reales del período seleccionado." />
      ) : null}

      <section className="nx-analytics-kpi-grid" aria-label="KPIs principales">
        {kpis.map((kpi) => (
          <article className={`nx-analytics-kpi nx-analytics-kpi--${kpi.tone}`} key={kpi.label}>
            <div className="nx-analytics-kpi__top">
              <span>{kpi.label}</span>
              <i aria-hidden="true">{kpi.icon}</i>
            </div>
            <strong>{kpi.value}</strong>
            <p>{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="nx-analytics-grid nx-analytics-grid--charts">
        <article className="nx-analytics-card nx-analytics-card--wide">
          <div className="nx-analytics-card__head">
            <div>
              <span>Evolución</span>
              <h2>Turnos por día</h2>
            </div>
            <small>{data.timelineDaily.length} puntos</small>
          </div>
          {data.timelineDaily.length ? (
            <div className="nx-analytics-timeline" aria-label="Evolución diaria de turnos">
              {data.timelineDaily.map((day) => (
                <div className="nx-analytics-timeline__bar" key={day.date} style={{ '--bar-height': `${Math.max(8, (day.count / maxDaily) * 100)}%` } as CSSProperties}>
                  <span>{formatNumber(day.count)}</span>
                  <i aria-hidden="true" />
                  <small>{formatDate(day.date)}</small>
                </div>
              ))}
            </div>
          ) : <EmptyState title="Sin evolución disponible" description="No hay turnos suficientes para construir una serie diaria en este rango." />}
        </article>

        <article className="nx-analytics-card">
          <div className="nx-analytics-card__head">
            <div>
              <span>Distribución</span>
              <h2>Estados de turnos</h2>
            </div>
          </div>
          {statusEntries.length ? (
            <div className="nx-analytics-status">
              <div className="nx-analytics-donut" style={{ '--donut-gradient': donutGradient } as CSSProperties} aria-hidden="true">
                <strong>{formatNumber(data.kpis.totalAppointments)}</strong>
                <span>turnos</span>
              </div>
              <div className="nx-analytics-status__legend">
                {statusEntries.map(([key, count]) => (
                  <div key={key}>
                    <i style={{ '--legend-color': statusColors[key] } as CSSProperties} aria-hidden="true" />
                    <span>{statusLabels[key]}</span>
                    <strong>{formatNumber(count)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState title="Sin estados para mostrar" description="La distribución se completará cuando existan turnos en el período seleccionado." />}
        </article>
      </section>

      <section className="nx-analytics-grid nx-analytics-grid--secondary">
        <article className="nx-analytics-card">
          <div className="nx-analytics-card__head">
            <div>
              <span>Ranking</span>
              <h2>Profesionales con más actividad</h2>
            </div>
          </div>
          {data.byProfessional.length ? data.byProfessional.slice(0, 6).map((professional, index) => (
            <div className="nx-analytics-rank" key={professional.professionalId}>
              <span>{index + 1}</span>
              <div>
                <strong>{professional.label}</strong>
                <div className="nx-analytics-progress"><i style={{ '--progress': `${(professional.count / maxProfessional) * 100}%` } as CSSProperties} /></div>
              </div>
              <em>{formatNumber(professional.count)}</em>
            </div>
          )) : <EmptyState title="Sin actividad por profesional" description="Aún no hay turnos asociados a profesionales para este rango." />}
        </article>

        <article className="nx-analytics-card">
          <div className="nx-analytics-card__head">
            <div>
              <span>Demanda</span>
              <h2>Especialidades más solicitadas</h2>
            </div>
          </div>
          {data.bySpecialty.length ? data.bySpecialty.slice(0, 6).map((specialty) => (
            <div className="nx-analytics-specialty" key={specialty.specialtyId ?? specialty.label}>
              <div>
                <strong>{specialty.label}</strong>
                <span>{formatNumber(specialty.count)} turnos</span>
              </div>
              <div className="nx-analytics-progress"><i style={{ '--progress': `${(specialty.count / maxSpecialty) * 100}%` } as CSSProperties} /></div>
            </div>
          )) : <EmptyState title="Sin demanda por especialidad" description="La distribución por especialidad aparecerá cuando los turnos tengan ese dato cargado." />}
        </article>

        <article className="nx-analytics-card nx-analytics-card--coverage">
          <div className="nx-analytics-card__head">
            <div>
              <span>Cobertura</span>
              <h2>Disponibilidad de métricas</h2>
            </div>
          </div>
          <p>Este panel muestra únicamente indicadores calculados con datos reales del backend.</p>
          {data.coverage.notSupportedYet.length ? (
            <ul>
              {data.coverage.notSupportedYet.map((metric) => <li key={metric}>{metric.replaceAll('_', ' ')}</li>)}
            </ul>
          ) : <p className="nx-analytics-positive">Todas las métricas previstas están disponibles.</p>}
        </article>
      </section>
    </main>
  );
};
