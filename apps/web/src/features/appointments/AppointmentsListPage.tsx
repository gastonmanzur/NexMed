import type { AppointmentDto, AppointmentStatus, ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments-api';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';

const appointmentStatuses: AppointmentStatus[] = [
  'booked',
  'canceled_by_staff',
  'canceled_by_patient',
  'rescheduled',
  'completed',
  'no_show'
];

const formatDateTime = (value: string): string => new Date(value).toLocaleString();

export const AppointmentsListPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId, memberships } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState<{ professionalId: string; status: string; from: string; to: string }>({
    professionalId: '',
    status: '',
    from: '',
    to: ''
  });

  const activeMembership = useMemo(
    () => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );
  const canManage = activeMembership?.role === 'owner' || activeMembership?.role === 'admin';

  const professionalsById = useMemo(
    () => new Map(professionals.map((item) => [item.id, item.displayName])),
    [professionals]
  );

  const specialtiesById = useMemo(
    () => new Map(specialties.map((item) => [item.id, item.name])),
    [specialties]
  );

  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;

    setLoading(true);
    setError('');

    try {
      const [appointmentsData, professionalsData, specialtiesData] = await Promise.all([
        appointmentsApi.list(accessToken, activeOrganizationId, {
          ...(filters.professionalId ? { professionalId: filters.professionalId } : {}),
          ...(filters.status ? { status: filters.status as AppointmentStatus } : {}),
          ...(filters.from ? { from: new Date(`${filters.from}T00:00:00`).toISOString() } : {}),
          ...(filters.to ? { to: new Date(`${filters.to}T23:59:59`).toISOString() } : {})
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeOrganizationId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  return (
    <main style={{ maxWidth: 1200, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <Card title="Turnos">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/app">Volver al dashboard</Link>
          {canManage ? <Link to="/app/appointments/new">Crear turno</Link> : null}
          <button type="button" onClick={() => void load()} disabled={loading}>
            Recargar
          </button>
        </div>

        <form
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem', alignItems: 'end' }}
          onSubmit={async (event) => {
            event.preventDefault();
            await load();
          }}
        >
          <label>
            Profesional
            <select
              value={filters.professionalId}
              onChange={(event) => setFilters((current) => ({ ...current, professionalId: event.target.value }))}
            >
              <option value="">Todos</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.displayName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estado
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Todos</option>
              {appointmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Desde
            <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </label>

          <label>
            Hasta
            <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </label>

          <button type="submit">Aplicar filtros</button>
        </form>

        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </Card>

      <Card title="Listado">
        {loading ? <p>Cargando turnos...</p> : null}
        {!loading && appointments.length === 0 ? <p>No hay turnos para los filtros seleccionados.</p> : null}
        {appointments.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Paciente</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Profesional</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Especialidad</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Inicio</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Fin</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Estado</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Origen</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td style={{ padding: '0.4rem 0' }}>{appointment.patientName}</td>
                    <td>{professionalsById.get(appointment.professionalId) ?? appointment.professionalId}</td>
                    <td>{appointment.specialtyId ? specialtiesById.get(appointment.specialtyId) ?? appointment.specialtyId : '-'}</td>
                    <td>{formatDateTime(appointment.startAt)}</td>
                    <td>{formatDateTime(appointment.endAt)}</td>
                    <td>
                      <strong>{appointment.status}</strong>
                    </td>
                    <td>{appointment.source}</td>
                    <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link to={`/app/appointments/${appointment.id}`}>Ver</Link>
                      {canManage && appointment.status === 'booked' ? (
                        <>
                          <Link to={`/app/appointments/${appointment.id}/reschedule`}>Reprogramar</Link>
                          <button
                            type="button"
                            onClick={async () => {
                              const reason = window.prompt('Motivo de cancelación (opcional)') ?? undefined;
                              try {
                                if (!accessToken) return;
                                await appointmentsApi.cancel(accessToken, activeOrganizationId, appointment.id, reason);
                                await load();
                              } catch (cause) {
                                setError((cause as Error).message);
                              }
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </main>
  );
};
