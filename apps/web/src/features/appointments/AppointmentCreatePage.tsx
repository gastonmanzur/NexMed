import type { ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import { availabilityApi } from '../professionals/availability-api';
import { appointmentsApi } from './appointments-api';

const todayDate = (): string => new Date().toISOString().slice(0, 10);

export const AppointmentCreatePage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId } = useAuth();
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [availability, setAvailability] = useState<Array<{ startsAtIso: string; endsAtIso: string; label: string }>>([]);

  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [date, setDate] = useState(todayDate());
  const [slot, setSlot] = useState('');

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === professionalId) ?? null,
    [professionalId, professionals]
  );

  const specialtyOptions = useMemo(() => {
    if (!selectedProfessional) return [];
    const allowed = new Set(selectedProfessional.specialties.map((item) => item.id));
    return specialties.filter((specialty) => allowed.has(specialty.id));
  }, [selectedProfessional, specialties]);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (!accessToken || !activeOrganizationId) return;
      setLoading(true);
      setError('');

      try {
        const [professionalsData, specialtiesData] = await Promise.all([
          professionalsApi.list(accessToken, activeOrganizationId),
          specialtiesApi.list(accessToken, activeOrganizationId)
        ]);
        setProfessionals(professionalsData);
        setSpecialties(specialtiesData);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [accessToken, activeOrganizationId]);

  const loadAvailability = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !professionalId) return;

    setError('');
    setSlot('');

    try {
      const data = await availabilityApi.getCalculatedAvailability(accessToken, activeOrganizationId, professionalId, date, date);
      const slots = data.days.flatMap((day) =>
        day.slots.map((item) => ({
          startsAtIso: item.startsAtIso,
          endsAtIso: item.endsAtIso,
          label: `${item.startTime} - ${item.endTime}`
        }))
      );

      setAvailability(slots);
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

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <Card title="Nuevo turno">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/app/appointments">Volver al listado</Link>
        </div>
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

        {loading ? <p>Cargando profesionales y especialidades...</p> : null}

        {!loading ? (
          <form
            style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!accessToken || !slot) return;

              const selectedSlot = availability.find((item) => item.startsAtIso === slot);
              if (!selectedSlot) {
                setError('Seleccioná un slot válido.');
                return;
              }

              try {
                setSaving(true);
                setError('');

                const created = await appointmentsApi.create(accessToken, activeOrganizationId, {
                  professionalId,
                  ...(specialtyId ? { specialtyId } : {}),
                  patientName,
                  ...(patientPhone.trim() ? { patientPhone: patientPhone.trim() } : {}),
                  ...(patientEmail.trim() ? { patientEmail: patientEmail.trim() } : {}),
                  startAt: new Date(`${selectedSlot.startsAtIso}Z`).toISOString(),
                  endAt: new Date(`${selectedSlot.endsAtIso}Z`).toISOString(),
                  ...(notes.trim() ? { notes: notes.trim() } : {})
                });

                navigate(`/app/appointments/${created.id}`);
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Profesional
              <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} required>
                <option value="">Seleccionar...</option>
                {professionals
                  .filter((professional) => professional.status === 'active')
                  .map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.displayName}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Especialidad (opcional)
              <select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} disabled={!professionalId}>
                <option value="">Sin especialidad</option>
                {specialtyOptions.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
              <label>
                Fecha de agenda
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <button type="button" onClick={() => void loadAvailability()} disabled={!professionalId}>
                Consultar disponibilidad
              </button>
            </div>

            <label>
              Slot disponible
              <select value={slot} onChange={(event) => setSlot(event.target.value)} required disabled={availability.length === 0}>
                <option value="">Seleccionar...</option>
                {availability.map((item) => (
                  <option key={item.startsAtIso} value={item.startsAtIso}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {professionalId && availability.length === 0 ? (
              <p style={{ color: '#555' }}>No hay slots disponibles para la fecha seleccionada.</p>
            ) : null}

            <label>
              Nombre del paciente
              <input type="text" value={patientName} onChange={(event) => setPatientName(event.target.value)} required />
            </label>

            <label>
              Teléfono (opcional)
              <input type="text" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} />
            </label>

            <label>
              Email (opcional)
              <input type="email" value={patientEmail} onChange={(event) => setPatientEmail(event.target.value)} />
            </label>

            <label>
              Notas (opcional)
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </label>

            <button type="submit" disabled={saving || !slot}>
              {saving ? 'Guardando...' : 'Crear turno'}
            </button>
          </form>
        ) : null}
      </Card>
    </main>
  );
};
