import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!organizationId || startDate || endDate) return;
    const now = new Date();
    const start = now.toISOString().slice(0, 10);
    const later = new Date(now.getTime() + (14 * 86400000));
    setStartDate(start);
    setEndDate(later.toISOString().slice(0, 10));
  }, [organizationId, startDate, endDate]);

  const submit = async (event: React.FormEvent) => {
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
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Nueva alerta de disponibilidad">
        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <label>Organization ID<input value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required /></label>
          <label>Professional ID (opcional)<input value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} /></label>
          <label>Specialty ID (opcional)<input value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)} /></label>
          <label>Desde<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></label>
          <label>Hasta<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></label>
          <label>Hora inicio (opcional)<input type="time" value={timeWindowStart} onChange={(e) => setTimeWindowStart(e.target.value)} /></label>
          <label>Hora fin (opcional)<input type="time" value={timeWindowEnd} onChange={(e) => setTimeWindowEnd(e.target.value)} /></label>
          <button type="submit">Crear alerta</button>
        </form>
        {success ? <p style={{ color: 'green' }}>{success}</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </Card>
    </main>
  );
};
