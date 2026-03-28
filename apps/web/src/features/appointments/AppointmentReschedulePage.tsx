import type { ProfessionalDto, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { appointmentsApi } from './appointments-api';
import { professionalsApi } from '../professionals/professionals-api';
import { specialtiesApi } from '../specialties/specialties-api';
import { availabilityApi } from '../professionals/availability-api';

const toInputDate = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

export const AppointmentReschedulePage = (): ReactElement => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, accessToken, activeOrganizationId } = useAuth();
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [slotOptions, setSlotOptions] = useState<Array<{ startsAtIso: string; endsAtIso: string; label: string }>>([]);

  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');

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
    const load = async (): Promise<void> => {
      if (!accessToken || !activeOrganizationId || !appointmentId) return;
      setLoading(true);
      setError('');

      try {
        const [appointment, professionalsData, specialtiesData] = await Promise.all([
          appointmentsApi.getById(accessToken, activeOrganizationId, appointmentId),
          professionalsApi.list(accessToken, activeOrganizationId),
          specialtiesApi.list(accessToken, activeOrganizationId)
        ]);

        setProfessionals(professionalsData);
        setSpecialties(specialtiesData);
        setProfessionalId(appointment.professionalId);
        setSpecialtyId(appointment.specialtyId ?? '');
        setDate(toInputDate(appointment.startAt));
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [accessToken, activeOrganizationId, appointmentId]);

  const loadAvailability = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId || !professionalId || !date) return;

    setSlot('');
    setError('');

    try {
      const data = await availabilityApi.getCalculatedAvailability(accessToken, activeOrganizationId, professionalId, date, date);
      const slots = data.days.flatMap((day) =>
        day.slots.map((item) => ({
          startsAtIso: item.startsAtIso,
          endsAtIso: item.endsAtIso,
          label: `${item.startTime} - ${item.endTime}`
        }))
      );
      setSlotOptions(slots);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;
  if (!appointmentId) return <Navigate to="/app/appointments" replace />;

  return (
    <main style={{ maxWidth: 900, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Reprogramar turno">
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/app/appointments/${appointmentId}`}>Volver al detalle</Link>
        </div>

        {loading ? <p>Cargando datos...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

        {!loading ? (
          <form
            style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!accessToken) return;

              const selected = slotOptions.find((item) => item.startsAtIso === slot);
              if (!selected) {
                setError('Seleccioná un nuevo slot.');
                return;
              }

              try {
                setSaving(true);
                setError('');
                const result = await appointmentsApi.reschedule(accessToken, activeOrganizationId, appointmentId, {
                  newProfessionalId: professionalId,
                  ...(specialtyId ? { newSpecialtyId: specialtyId } : {}),
                  newStartAt: new Date(`${selected.startsAtIso}Z`).toISOString(),
                  newEndAt: new Date(`${selected.endsAtIso}Z`).toISOString(),
                  ...(reason.trim() ? { reason: reason.trim() } : {})
                });

                navigate(`/app/appointments/${result.replacement.id}`);
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Nuevo profesional
              <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} required>
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
              Nueva especialidad (opcional)
              <select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
                <option value="">Sin especialidad</option>
                {specialtyOptions.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
              <label>
                Fecha
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <button type="button" onClick={() => void loadAvailability()}>
                Consultar disponibilidad
              </button>
            </div>

            <label>
              Nuevo slot
              <select value={slot} onChange={(event) => setSlot(event.target.value)} required disabled={slotOptions.length === 0}>
                <option value="">Seleccionar...</option>
                {slotOptions.map((item) => (
                  <option key={item.startsAtIso} value={item.startsAtIso}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {slotOptions.length === 0 ? <p style={{ color: '#555' }}>No hay slots disponibles para esa fecha.</p> : null}

            <label>
              Motivo (opcional)
              <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>

            <button type="submit" disabled={saving || !slot}>
              {saving ? 'Reprogramando...' : 'Confirmar reprogramación'}
            </button>
          </form>
        ) : null}
      </Card>
    </main>
  );
};
