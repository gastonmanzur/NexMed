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
    <main className="nx-page nx-page--appointments">
      <Card title="Mis turnos" subtitle="Consultá el estado de tus turnos y gestioná cambios cuando lo necesites.">
        <p>
          <Link to="/feedback" state={{ fromPath: '/patient/appointments' }}>
            Enviar feedback
          </Link>
        </p>

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
            {activeTab === 'upcoming' ? <h3 className="nx-section-title">Próximos</h3> : <h3 className="nx-section-title">Historial</h3>}

            {activeTab === 'upcoming' && upcoming.length === 0 ? (
              <EmptyState
                title="Sin turnos próximos"
                description="Cuando reserves un turno, lo verás acá."
                action={
                  <Link className="nx-btn" to="/patient/book">
                    Reservar un turno
                  </Link>
                }
                icon="🗓️"
              />
            ) : activeTab === 'upcoming' ? (
              <ul className="nx-appointment-list">
                {upcoming.map((item) => (
                  <li key={item.id} className="nx-appointment-item">
                    <div>
                      <p className="nx-appointment-item__date">
                        {new Date(item.startAt).toLocaleString('es-AR', { hour12: false })}
                      </p>
                      <p className="nx-appointment-item__status">Estado: {item.status}</p>
                    </div>
                    <div className="nx-appointment-item__actions">
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
                      </ConfirmActionButton>
                      <Link className="nx-btn-secondary" to={`/patient/appointments/${item.id}/reschedule`}>
                        Reprogramar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {activeTab === 'history' && history.length === 0 ? (
              <EmptyState title="Sin historial todavía" description="Acá vas a ver tus turnos ya atendidos o cerrados." icon="🧾" />
            ) : activeTab === 'history' ? (
              <ul className="nx-appointment-list">
                {history.map((item) => (
                  <li key={item.id} className="nx-appointment-item nx-appointment-item--history">
                    <p className="nx-appointment-item__date">
                      {new Date(item.startAt).toLocaleString('es-AR', { hour12: false })}
                    </p>
                    <p className="nx-appointment-item__status">Estado: {item.status}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </Card>
    </main>
  );
};
