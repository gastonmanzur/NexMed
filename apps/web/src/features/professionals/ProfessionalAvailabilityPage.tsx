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
import './ProfessionalAvailabilityPage.css';

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
    <main className="nx-availability-page">
      <Card title="Agenda de profesional" subtitle="Configurá y supervisá la agenda del profesional seleccionado.">
        <div className="nx-availability-overview">
          <div className="nx-availability-actions">
            <Link className="nx-btn-secondary" to="/app/professionals">Volver a profesionales</Link>
            <button className="nx-btn-secondary" type="button" onClick={() => void loadAll()} disabled={loading}>
              Recargar
            </button>
          </div>
        </div>
        {professional ? (
          <p className="nx-availability-status">
            <strong>{professional.displayName}</strong> · estado <span className={`nx-badge ${professional.status === 'active' ? 'nx-badge--active' : 'nx-badge--inactive'}`}>{professional.status}</span>
          </p>
        ) : null}
        {feedback ? <p className="nx-alert nx-alert--success">{feedback}</p> : null}
        {error ? <p className="nx-alert nx-alert--error">{error}</p> : null}
      </Card>

      <Card title="Reglas semanales">
        {loading ? <p>Cargando reglas...</p> : null}
        {!loading && rules.length === 0 ? <p>No hay reglas cargadas. Creá la primera para habilitar disponibilidad.</p> : null}
        {rules.length > 0 ? (
          <ul className="nx-availability-list">
            {rules.map((rule) => (
              <li key={rule.id} className="nx-availability-list-item">
                <p className="nx-availability-list-item__meta">
                  <strong>{weekdayLabels[rule.weekday]}</strong> {rule.startTime} - {rule.endTime} · turno {rule.appointmentDurationMinutes}m ·
                  buffer {rule.bufferMinutes}m · estado <strong>{rule.status}</strong>
                </p>
                {canManage ? (
                  <button
                    className="nx-btn-secondary"
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
            className="nx-availability-form"
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
            <h3 className="nx-availability-form__title">Nueva regla semanal</h3>
            <div className="nx-availability-form-grid">
            <label className="nx-field">
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
            <label className="nx-field">
              Hora inicio
              <input
                type="time"
                value={ruleForm.startTime}
                onChange={(event) => setRuleForm((current) => ({ ...current, startTime: event.target.value }))}
                required
              />
            </label>
            <label className="nx-field">
              Hora fin
              <input
                type="time"
                value={ruleForm.endTime}
                onChange={(event) => setRuleForm((current) => ({ ...current, endTime: event.target.value }))}
                required
              />
            </label>
            <label className="nx-field">
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
            <label className="nx-field">
              Buffer (min)
              <input
                type="number"
                min={0}
                value={ruleForm.bufferMinutes}
                onChange={(event) => setRuleForm((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))}
              />
            </label>
            </div>
            <button className="nx-btn" type="submit" disabled={savingRule}>
              {savingRule ? 'Guardando...' : 'Crear regla'}
            </button>
          </form>
        ) : (
          <p className="nx-availability-note">Solo owner/admin pueden modificar reglas.</p>
        )}
      </Card>

      <Card title="Excepciones y bloqueos">
        {loading ? <p>Cargando excepciones...</p> : null}
        {!loading && exceptions.length === 0 ? <p>No hay excepciones para este profesional.</p> : null}
        {exceptions.length > 0 ? (
          <ul className="nx-availability-list">
            {exceptions.map((exception) => (
              <li key={exception.id} className="nx-availability-list-item">
                <p className="nx-availability-list-item__meta">
                  <strong>{exception.date}</strong> · {exception.type}
                  {exception.startTime && exception.endTime ? ` ${exception.startTime}-${exception.endTime}` : ''} · estado{' '}
                  <strong>{exception.status}</strong>
                </p>
                {exception.reason ? <p className="nx-availability-note">Motivo: {exception.reason}</p> : null}
                {canManage ? (
                  <button
                    className="nx-btn-secondary"
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
            className="nx-availability-form"
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
            <h3 className="nx-availability-form__title">Nueva excepción</h3>
            <div className="nx-availability-form-grid">
            <label className="nx-field">
              Fecha
              <input
                type="date"
                value={exceptionForm.date}
                onChange={(event) => setExceptionForm((current) => ({ ...current, date: event.target.value }))}
                required
              />
            </label>
            <label className="nx-field">
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
                <label className="nx-field">
                  Hora inicio
                  <input
                    type="time"
                    value={exceptionForm.startTime}
                    onChange={(event) => setExceptionForm((current) => ({ ...current, startTime: event.target.value }))}
                    required
                  />
                </label>
                <label className="nx-field">
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
            <label className="nx-field">
              Motivo (opcional)
              <input
                type="text"
                value={exceptionForm.reason}
                onChange={(event) => setExceptionForm((current) => ({ ...current, reason: event.target.value }))}
                maxLength={500}
              />
            </label>
            </div>
            <button className="nx-btn" type="submit" disabled={savingException}>
              {savingException ? 'Guardando...' : 'Crear excepción'}
            </button>
          </form>
        ) : (
          <p className="nx-availability-note">Solo owner/admin pueden modificar excepciones.</p>
        )}
      </Card>

      <Card title="Disponibilidad calculada">
        <form className="nx-availability-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await refreshAvailability();
          }}
>
          <div className="nx-availability-range-grid">
          <label className="nx-field">
            Desde
            <input
              type="date"
              value={range.startDate}
              onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
              required
            />
          </label>
          <label className="nx-field">
            Hasta
            <input
              type="date"
              value={range.endDate}
              onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
              required
            />
          </label>
          </div>
          <div className="nx-availability-form-actions">
            <button className="nx-btn" type="submit">Consultar</button>
          </div>
        </form>

        {availability ? (
          <>
            <p>
              Timezone: <strong>{availability.timezone}</strong> · Estado profesional:{' '}
              <strong>{availability.professionalStatus}</strong>
            </p>
            <p className="nx-availability-note">{availability.note}</p>
            {availability.days.length === 0 ? <p>Sin resultados para ese rango.</p> : null}
            <ul className="nx-availability-list">
              {availability.days.map((day) => (
                <li key={day.date} className="nx-availability-day">
                  <p className="nx-availability-list-item__meta">
                    <strong>{day.date}</strong>
                  </p>
                  {day.slots.length === 0 ? (
                    <p className="nx-availability-day__slots">Sin disponibilidad</p>
                  ) : (
                    <p className="nx-availability-day__slots">{day.slots.map((slot) => `${slot.startTime}–${slot.endTime}`).join(' · ')}</p>
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
