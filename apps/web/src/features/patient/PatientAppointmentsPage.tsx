import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppointmentDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';

export const PatientAppointmentsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [upcoming, setUpcoming] = useState<AppointmentDto[]>([]);
  const [history, setHistory] = useState<AppointmentDto[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await patientApi.listAppointments(accessToken);
      setUpcoming(data.upcoming);
      setHistory(data.history);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [accessToken]);

  return (
    <main style={{ maxWidth: 980, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Mis turnos">
        <p><Link to="/feedback" state={{ fromPath: '/patient/appointments' }}>Enviar feedback</Link></p>
        <div className="nx-tabs" role="tablist" aria-label="Filtrar turnos">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            className={`nx-tab${activeTab === 'upcoming' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Próximos ({upcoming.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`nx-tab${activeTab === 'history' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Historial ({history.length})
          </button>
        </div>
        {loading ? <LoadingState message="Cargando turnos..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
        {!loading && !error ? (
          <>
            {activeTab === 'upcoming' ? <h3>Próximos</h3> : <h3>Historial</h3>}
            {activeTab === 'upcoming' && upcoming.length === 0 ? (
              <EmptyState
                title="Sin turnos próximos"
                description="Cuando reserves un turno, lo verás acá."
                action={<Link className="nx-btn" to="/patient/book">Reservar un turno</Link>}
              />
            ) : (
              activeTab === 'upcoming' ? <ul>
                {upcoming.map((item) => (
                  <li key={item.id} style={{ marginBottom: '0.75rem' }}>
                    {new Date(item.startAt).toLocaleString('es-AR', { hour12: false })} · estado: {item.status} ·{' '}
                    <ConfirmActionButton
                      confirmationMessage="¿Seguro que querés cancelar este turno?"
                      onConfirm={async () => {
                        if (!accessToken) return;
                        try {
                          await patientApi.cancelAppointment(accessToken, item.id, 'Cancelado por paciente');
                          await reload();
                        } catch (cause) {
                          setError((cause as Error).message);
                        }
                      }}
                    >
                      Cancelar
                    </ConfirmActionButton>{' '}
                    · <Link to={`/patient/appointments/${item.id}/reschedule`}>Reprogramar</Link>
                  </li>
                ))}
              </ul> : null
            )}
            {activeTab === 'history' && history.length === 0 ? (
              <EmptyState title="Sin historial todavía" description="Acá vas a ver tus turnos ya atendidos o cerrados." />
            ) : (
              activeTab === 'history' ? <ul>
                {history.map((item) => (
                  <li key={item.id}>
                    {new Date(item.startAt).toLocaleString('es-AR', { hour12: false })} · estado: {item.status}
                  </li>
                ))}
              </ul> : null
            )}
          </>
        ) : null}
      </Card>
    </main>
  );
};
