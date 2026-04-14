import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PatientFamilyMemberDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

const today = new Date().toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);

export const PatientBookPage = (): ReactElement => {
  const { organizationId = '' } = useParams();
  const { accessToken } = useAuth();

  const [professionals, setProfessionals] = useState<Array<{ id: string; displayName: string }>>([]);
  const [specialties, setSpecialties] = useState<Array<{ id: string; name: string }>>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [beneficiaryType, setBeneficiaryType] = useState<'self' | 'family_member'>('self');
  const [familyMemberId, setFamilyMemberId] = useState('');
  const [familyMembers, setFamilyMembers] = useState<PatientFamilyMemberDto[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [slots, setSlots] = useState<
    Array<{ startsAtIso: string; endsAtIso: string; startTime: string; endTime: string }>
  >([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void patientApi
      .getOrganizationCatalog(accessToken, organizationId)
      .then((catalog) => {
        setProfessionals(catalog.professionals);
        setSpecialties(catalog.specialties);

        if (catalog.professionals[0]) {
          setProfessionalId(catalog.professionals[0].id);
        }
      })
      .catch((cause) => setError((cause as Error).message));

    void patientApi
      .listFamilyMembers(accessToken)
      .then((data) => {
        const active = data.filter((item) => item.isActive);
        setFamilyMembers(active);
        if (active[0]) {
          setFamilyMemberId(active[0].id);
        }
      })
      .catch((cause) => setError((cause as Error).message));
  }, [accessToken, organizationId]);

  const selectedProfessionalName = useMemo(
    () => professionals.find((item) => item.id === professionalId)?.displayName ?? '-',
    [professionalId, professionals]
  );

  return (
    <main className="nx-page nx-page--book">
      <Card
        title="Reserva online"
        subtitle="Encontrá horarios disponibles y reservá tu turno en pocos pasos."
        className="nx-book-shell"
      >
        <div className="nx-form-grid nx-book-grid">
          <label className="nx-field">
            <span>Profesional</span>
            <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
              {professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>

          <label className="nx-field">
            <span>Especialidad (opcional)</span>
            <select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
              <option value="">Cualquiera</option>
              {specialties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="nx-field">
            <span>¿Para quién es este turno?</span>
            <select
              value={beneficiaryType}
              onChange={(event) => setBeneficiaryType(event.target.value as 'self' | 'family_member')}
            >
              <option value="self">Para mí</option>
              <option value="family_member">Para un familiar</option>
            </select>
          </label>

          {beneficiaryType === 'family_member' ? (
            <label className="nx-field">
              <span>Familiar</span>
              <select value={familyMemberId} onChange={(event) => setFamilyMemberId(event.target.value)}>
                {familyMembers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.firstName} {item.lastName} ({item.relationship})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="nx-field">
            <span>Desde</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>

          <label className="nx-field">
            <span>Hasta</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>

        <div className="nx-book-actions">
          <button
            type="button"
            className="nx-btn"
            onClick={async () => {
              if (!accessToken || !professionalId) {
                return;
              }

              try {
                setError('');
                const availability = await patientApi.getAvailability(accessToken, organizationId, {
                  professionalId,
                  startDate,
                  endDate
                });
                setSlots(availability.days.flatMap((day) => day.slots));
              } catch (cause) {
                setError((cause as Error).message);
              }
            }}
          >
            Buscar disponibilidad
          </button>

          <p className="nx-book-selected">
            <strong>Profesional:</strong> {selectedProfessionalName}
          </p>
        </div>

        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {message ? <p style={{ color: 'var(--success)' }}>{message}</p> : null}

        <ul className="nx-doctor-list">
          {slots.map((slot) => (
            <li key={slot.startsAtIso} className="nx-doctor-card">
              <div className="nx-doctor-card__top">
                <span className="nx-doctor-card__avatar" aria-hidden="true">
                  🩺
                </span>
                <div>
                  <p className="nx-doctor-card__name">{selectedProfessionalName}</p>
                  <span className="nx-badge">
                    {slot.startTime}–{slot.endTime}
                  </span>
                </div>
              </div>

              <p className="nx-doctor-card__description">
                {slot.startsAtIso.slice(0, 16).replace('T', ' ')} · Duración estimada: {slot.startTime}–{slot.endTime}
              </p>

              <div className="nx-doctor-card__meta">
                <span>Confirmación inmediata</span>
                <span>Reserva online</span>
              </div>

              <div className="nx-doctor-card__actions">
                <button
                  type="button"
                  className="nx-btn"
                  onClick={async () => {
                    if (!accessToken) {
                      return;
                    }

                    try {
                      setError('');
                      if (beneficiaryType === 'family_member' && !familyMemberId) {
                        setError('Seleccioná un familiar activo antes de reservar.');
                        return;
                      }
                      await patientApi.createAppointment(accessToken, organizationId, {
                        professionalId,
                        ...(specialtyId ? { specialtyId } : {}),
                        startAt: slot.startsAtIso,
                        endAt: slot.endsAtIso,
                        beneficiaryType,
                        ...(beneficiaryType === 'family_member' ? { familyMemberId } : {})
                      });
                      setMessage('Turno reservado con éxito.');
                      setSlots((prev) => prev.filter((current) => current.startsAtIso !== slot.startsAtIso));
                    } catch (cause) {
                      setError((cause as Error).message);
                    }
                  }}
                >
                  Reserva Turno
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
};
