import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { PatientOrganizationSummaryDto } from '@starter/shared-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

const createDefaultDateRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const later = new Date(now.getTime() + 14 * 86400000);

  return {
    startDate,
    endDate: later.toISOString().slice(0, 10)
  };
};

export const PatientWaitlistCreatePage = (): ReactElement => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [organizationId, setOrganizationId] = useState(params.get('organizationId') ?? '');
  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeWindowStart, setTimeWindowStart] = useState('');
  const [timeWindowEnd, setTimeWindowEnd] = useState('');

  const [organizations, setOrganizations] = useState<PatientOrganizationSummaryDto[]>([]);
  const [professionals, setProfessionals] = useState<Array<{ id: string; displayName: string }>>([]);
  const [specialties, setSpecialties] = useState<Array<{ id: string; name: string }>>([]);

  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void (async () => {
      setLoadingOrganizations(true);
      setError('');

      try {
        const rows = await patientApi.listOrganizations(accessToken);
        setOrganizations(rows);

        const validFromQuery = rows.some((item) => item.organization.id === organizationId);

        if (organizationId && !validFromQuery) {
          setOrganizationId('');
        }

        if (!organizationId && rows.length === 1) {
          setOrganizationId(rows[0]!.organization.id);
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoadingOrganizations(false);
      }
    })();
  }, [accessToken, organizationId]);

  useEffect(() => {
    if (!organizationId || startDate || endDate) {
      return;
    }

    const defaults = createDefaultDateRange();
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
  }, [organizationId, startDate, endDate]);

  useEffect(() => {
    if (!accessToken || !organizationId) {
      setProfessionals([]);
      setSpecialties([]);
      setProfessionalId('');
      setSpecialtyId('');
      return;
    }

    void (async () => {
      setLoadingCatalog(true);
      setError('');

      try {
        const catalog = await patientApi.getOrganizationCatalog(accessToken, organizationId);
        setProfessionals(catalog.professionals);
        setSpecialties(catalog.specialties);

        setProfessionalId((current) =>
          current && catalog.professionals.some((item) => item.id === current) ? current : ''
        );

        setSpecialtyId((current) =>
          current && catalog.specialties.some((item) => item.id === current) ? current : ''
        );
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [accessToken, organizationId]);

  const organizationOptions = useMemo(
    () =>
      organizations.map((item) => ({
        id: item.organization.id,
        label: item.organization.displayName ?? item.organization.name
      })),
    [organizations]
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setError('');
    setSuccess('');

    try {
      await patientApi.createWaitlist(accessToken, {
        organizationId,
        ...(professionalId ? { professionalId } : {}),
        ...(specialtyId ? { specialtyId } : {}),
        startDate,
        endDate,
        ...(timeWindowStart ? { timeWindowStart } : {}),
        ...(timeWindowEnd ? { timeWindowEnd } : {})
      });

      setSuccess('Alerta creada correctamente.');
      setTimeout(() => navigate('/patient/waitlist'), 500);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <main className="nx-page" style={{ maxWidth: 760 }}>
      <Card
        title="Nueva alerta de disponibilidad"
        subtitle="Elegí organización, profesional y especialidad para avisarte cuando se liberen turnos."
        className="nx-book-shell"
      >
        <form className="nx-form-grid" onSubmit={submit}>
          <label className="nx-field">
            <span>Organización</span>
            <select
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              required
              disabled={loadingOrganizations}
            >
              <option value="">{loadingOrganizations ? 'Cargando organizaciones...' : 'Seleccioná una organización'}</option>
              {organizationOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="nx-field">
            <span>Profesional (opcional)</span>
            <select
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
              disabled={!organizationId || loadingCatalog}
            >
              <option value="">
                {!organizationId
                  ? 'Elegí una organización primero'
                  : loadingCatalog
                    ? 'Cargando profesionales...'
                    : 'Cualquier profesional'}
              </option>
              {professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="nx-field">
            <span>Especialidad (opcional)</span>
            <select
              value={specialtyId}
              onChange={(event) => setSpecialtyId(event.target.value)}
              disabled={!organizationId || loadingCatalog}
            >
              <option value="">
                {!organizationId
                  ? 'Elegí una organización primero'
                  : loadingCatalog
                    ? 'Cargando especialidades...'
                    : 'Cualquier especialidad'}
              </option>
              {specialties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="nx-field">
            <span>Desde</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>

          <label className="nx-field">
            <span>Hasta</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </label>

          <label className="nx-field">
            <span>Hora inicio (opcional)</span>
            <input type="time" value={timeWindowStart} onChange={(event) => setTimeWindowStart(event.target.value)} />
          </label>

          <label className="nx-field">
            <span>Hora fin (opcional)</span>
            <input type="time" value={timeWindowEnd} onChange={(event) => setTimeWindowEnd(event.target.value)} />
          </label>

          <button type="submit" className="nx-btn" disabled={!organizationId || loadingCatalog || loadingOrganizations}>
            Crear alerta
          </button>
        </form>

        {success ? <p style={{ color: 'var(--success)' }}>{success}</p> : null}
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
      </Card>
    </main>
  );
};
