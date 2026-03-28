import type {
  AvailabilityExceptionDto,
  AvailabilityExceptionType,
  AvailabilityRuleDto,
  CalculatedAvailabilityDto,
  OrganizationMemberRole,
  ProfessionalDto
} from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { professionalsApi } from './professionals-api';
import { availabilityApi } from './availability-api';

const canManageByRole = (role: OrganizationMemberRole | undefined): boolean => role === 'owner' || role === 'admin';

const weekdayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const daysFromNowIsoDate = (days: number): string => {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString().slice(0, 10);
};

export const ProfessionalAvailabilityPage = (): ReactElement => {
  const { professionalId } = useParams<{ professionalId: string }>();
  const { user, accessToken, activeOrganizationId, memberships } = useAuth();

  const membership = useMemo(
    () => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );
  const canManage = canManageByRole(membership?.role);

  const [professional, setProfessional] = useState<ProfessionalDto | null>(null);
  const [rules, setRules] = useState<AvailabilityRuleDto[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityExceptionDto[]>([]);
  const [availability, setAvailability] = useState<CalculatedAvailabilityDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [range, setRange] = useState({ startDate: todayIsoDate(), endDate: daysFromNowIsoDate(7) });

  const [ruleForm, setRuleForm] = useState({
    weekday: 1,
    startTime: '09:00',
    endTime: '13:00',
    appointmentDurationMinutes: 30,
    bufferMinutes: 0
  });

  const [exceptionForm, setExceptionForm] = useState({
    date: todayIsoDate(),
    type: 'full_day_block' as AvailabilityExceptionType,
    startTime: '09:00',
    endTime: '10:00',
    reason: ''
  });

  const loadAll = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !professionalId) return;

    setLoading(true);
    setError('');

    try {
      const [professionalData, rulesData, exceptionsData, availabilityData] = await Promise.all([
        professionalsApi.getById(accessToken, activeOrganizationId, professionalId),
        availabilityApi.listRules(accessToken, activeOrganizationId, professionalId),
        availabilityApi.listExceptions(accessToken, activeOrganizationId, professionalId),
        availabilityApi.getCalculatedAvailability(accessToken, activeOrganizationId, professionalId, range.startDate, range.endDate)
      ]);

      setProfessional(professionalData);
      setRules(rulesData);
      setExceptions(exceptionsData);
      setAvailability(availabilityData);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeOrganizationId, professionalId]);

  const refreshAvailability = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !professionalId) return;

    try {
      const availabilityData = await availabilityApi.getCalculatedAvailability(
        accessToken,
        activeOrganizationId,
        professionalId,
        range.startDate,
        range.endDate
      );
      setAvailability(availabilityData);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  if (!professionalId) {
    return <Navigate to="/app/professionals" replace />;
  }

  return (
    <main style={{ maxWidth: 1100, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <Card title="Agenda de profesional">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/app/professionals">Volver a profesionales</Link>
          <button type="button" onClick={() => void loadAll()} disabled={loading}>
            Recargar
          </button>
        </div>
        {professional ? (
          <p style={{ marginTop: '0.75rem' }}>
            <strong>{professional.displayName}</strong> · estado <strong>{professional.status}</strong>
          </p>
        ) : null}
        {feedback ? <p style={{ color: 'green' }}>{feedback}</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </Card>

      <Card title="Reglas semanales">
        {loading ? <p>Cargando reglas...</p> : null}
        {!loading && rules.length === 0 ? <p>No hay reglas cargadas. Creá la primera para habilitar disponibilidad.</p> : null}
        {rules.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
            {rules.map((rule) => (
              <li key={rule.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.5rem' }}>
                <p style={{ margin: 0 }}>
                  <strong>{weekdayLabels[rule.weekday]}</strong> {rule.startTime} - {rule.endTime} · turno {rule.appointmentDurationMinutes}m ·
                  buffer {rule.bufferMinutes}m · estado <strong>{rule.status}</strong>
                </p>
                {canManage ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!accessToken) return;
                      const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
                      try {
                        const updated = await availabilityApi.updateRuleStatus(
                          accessToken,
                          activeOrganizationId,
                          professionalId,
                          rule.id,
                          nextStatus
                        );
                        setRules((current) => current.map((item) => (item.id === rule.id ? updated : item)));
                        await refreshAvailability();
                      } catch (cause) {
                        setError((cause as Error).message);
                      }
                    }}
                  >
                    {rule.status === 'active' ? 'Desactivar' : 'Activar'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {canManage ? (
          <form
            style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!accessToken) return;

              try {
                setSavingRule(true);
                setError('');
                setFeedback('');

                await availabilityApi.createRule(accessToken, activeOrganizationId, professionalId, ruleForm);
                setFeedback('Regla guardada correctamente.');
                const nextRules = await availabilityApi.listRules(accessToken, activeOrganizationId, professionalId);
                setRules(nextRules);
                await refreshAvailability();
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSavingRule(false);
              }
            }}
          >
            <h3 style={{ marginBottom: 0 }}>Nueva regla semanal</h3>
            <label>
              Día de semana
              <select
                value={ruleForm.weekday}
                onChange={(event) => setRuleForm((current) => ({ ...current, weekday: Number(event.target.value) }))}
              >
                {weekdayLabels.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hora inicio
              <input
                type="time"
                value={ruleForm.startTime}
                onChange={(event) => setRuleForm((current) => ({ ...current, startTime: event.target.value }))}
                required
              />
            </label>
            <label>
              Hora fin
              <input
                type="time"
                value={ruleForm.endTime}
                onChange={(event) => setRuleForm((current) => ({ ...current, endTime: event.target.value }))}
                required
              />
            </label>
            <label>
              Duración del turno (min)
              <input
                type="number"
                min={1}
                value={ruleForm.appointmentDurationMinutes}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, appointmentDurationMinutes: Number(event.target.value) }))
                }
                required
              />
            </label>
            <label>
              Buffer (min)
              <input
                type="number"
                min={0}
                value={ruleForm.bufferMinutes}
                onChange={(event) => setRuleForm((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))}
              />
            </label>
            <button type="submit" disabled={savingRule}>
              {savingRule ? 'Guardando...' : 'Crear regla'}
            </button>
          </form>
        ) : (
          <p style={{ color: '#555' }}>Solo owner/admin pueden modificar reglas.</p>
        )}
      </Card>

      <Card title="Excepciones y bloqueos">
        {loading ? <p>Cargando excepciones...</p> : null}
        {!loading && exceptions.length === 0 ? <p>No hay excepciones para este profesional.</p> : null}
        {exceptions.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
            {exceptions.map((exception) => (
              <li key={exception.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.5rem' }}>
                <p style={{ margin: 0 }}>
                  <strong>{exception.date}</strong> · {exception.type}
                  {exception.startTime && exception.endTime ? ` ${exception.startTime}-${exception.endTime}` : ''} · estado{' '}
                  <strong>{exception.status}</strong>
                </p>
                {exception.reason ? <p style={{ margin: '0.25rem 0 0 0' }}>Motivo: {exception.reason}</p> : null}
                {canManage ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!accessToken) return;
                      const nextStatus = exception.status === 'active' ? 'inactive' : 'active';
                      try {
                        const updated = await availabilityApi.updateExceptionStatus(
                          accessToken,
                          activeOrganizationId,
                          professionalId,
                          exception.id,
                          nextStatus
                        );
                        setExceptions((current) => current.map((item) => (item.id === exception.id ? updated : item)));
                        await refreshAvailability();
                      } catch (cause) {
                        setError((cause as Error).message);
                      }
                    }}
                  >
                    {exception.status === 'active' ? 'Desactivar' : 'Activar'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {canManage ? (
          <form
            style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!accessToken) return;

              try {
                setSavingException(true);
                setError('');
                setFeedback('');

                await availabilityApi.createException(accessToken, activeOrganizationId, professionalId, {
                  date: exceptionForm.date,
                  type: exceptionForm.type,
                  ...(exceptionForm.type === 'partial_block'
                    ? { startTime: exceptionForm.startTime, endTime: exceptionForm.endTime }
                    : {}),
                  ...(exceptionForm.reason.trim() ? { reason: exceptionForm.reason.trim() } : {})
                });
                setFeedback('Excepción guardada correctamente.');
                const nextExceptions = await availabilityApi.listExceptions(accessToken, activeOrganizationId, professionalId);
                setExceptions(nextExceptions);
                await refreshAvailability();
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSavingException(false);
              }
            }}
          >
            <h3 style={{ marginBottom: 0 }}>Nueva excepción</h3>
            <label>
              Fecha
              <input
                type="date"
                value={exceptionForm.date}
                onChange={(event) => setExceptionForm((current) => ({ ...current, date: event.target.value }))}
                required
              />
            </label>
            <label>
              Tipo
              <select
                value={exceptionForm.type}
                onChange={(event) =>
                  setExceptionForm((current) => ({ ...current, type: event.target.value as AvailabilityExceptionType }))
                }
              >
                <option value="full_day_block">Bloqueo día completo</option>
                <option value="partial_block">Bloqueo parcial</option>
              </select>
            </label>
            {exceptionForm.type === 'partial_block' ? (
              <>
                <label>
                  Hora inicio
                  <input
                    type="time"
                    value={exceptionForm.startTime}
                    onChange={(event) => setExceptionForm((current) => ({ ...current, startTime: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Hora fin
                  <input
                    type="time"
                    value={exceptionForm.endTime}
                    onChange={(event) => setExceptionForm((current) => ({ ...current, endTime: event.target.value }))}
                    required
                  />
                </label>
              </>
            ) : null}
            <label>
              Motivo (opcional)
              <input
                type="text"
                value={exceptionForm.reason}
                onChange={(event) => setExceptionForm((current) => ({ ...current, reason: event.target.value }))}
                maxLength={500}
              />
            </label>
            <button type="submit" disabled={savingException}>
              {savingException ? 'Guardando...' : 'Crear excepción'}
            </button>
          </form>
        ) : (
          <p style={{ color: '#555' }}>Solo owner/admin pueden modificar excepciones.</p>
        )}
      </Card>

      <Card title="Disponibilidad calculada">
        <form
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}
          onSubmit={async (event) => {
            event.preventDefault();
            await refreshAvailability();
          }}
        >
          <label>
            Desde
            <input
              type="date"
              value={range.startDate}
              onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
              required
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={range.endDate}
              onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
              required
            />
          </label>
          <button type="submit">Consultar</button>
        </form>

        {availability ? (
          <>
            <p>
              Timezone: <strong>{availability.timezone}</strong> · Estado profesional:{' '}
              <strong>{availability.professionalStatus}</strong>
            </p>
            <p style={{ color: '#555' }}>{availability.note}</p>
            {availability.days.length === 0 ? <p>Sin resultados para ese rango.</p> : null}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {availability.days.map((day) => (
                <li key={day.date} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.5rem' }}>
                  <p style={{ margin: 0 }}>
                    <strong>{day.date}</strong>
                  </p>
                  {day.slots.length === 0 ? (
                    <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>Sin disponibilidad</p>
                  ) : (
                    <p style={{ margin: '0.25rem 0 0 0' }}>{day.slots.map((slot) => `${slot.startTime}–${slot.endTime}`).join(' · ')}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Consultá un rango para ver disponibilidad.</p>
        )}
      </Card>
    </main>
  );
};
