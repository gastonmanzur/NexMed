import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AppointmentDto, AppointmentDurationMultiplier, PatientFamilyMemberDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { OrganizationLocationCard } from './OrganizationLocationCard';

const today = new Date().toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);

type BookableSlot = { startsAtIso: string; endsAtIso: string; startTime: string; endTime: string };
type CatalogProfessional = { id: string; displayName: string; specialtyIds: string[] };
type CatalogSpecialty = { id: string; name: string; professionalIds: string[] };

const slotDurationMinutes = (slot: BookableSlot): number =>
  Math.max(0, Math.round((new Date(slot.endsAtIso).getTime() - new Date(slot.startsAtIso).getTime()) / 60000));

export const PatientBookPage = (): ReactElement => {
  const { organizationId = '' } = useParams();
  const { accessToken } = useAuth();

  const [professionals, setProfessionals] = useState<CatalogProfessional[]>([]);
  const [specialties, setSpecialties] = useState<CatalogSpecialty[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [beneficiaryType, setBeneficiaryType] = useState<'self' | 'family_member'>('self');
  const [familyMemberId, setFamilyMemberId] = useState('');
  const [familyMembers, setFamilyMembers] = useState<PatientFamilyMemberDto[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [durationMultiplier, setDurationMultiplier] = useState<AppointmentDurationMultiplier>(1);
  const [message, setMessage] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentDto | null>(null);
  const [error, setError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState('');

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    setCatalogLoading(true);
    void patientApi
      .getOrganizationCatalog(accessToken, organizationId)
      .then((catalog) => {
        setProfessionals(catalog.professionals);
        setSpecialties(catalog.specialties);
        setProfessionalId('');
        setSpecialtyId('');
        setSlots([]);
      })
      .catch((cause) => setError((cause as Error).message))
      .finally(() => setCatalogLoading(false));

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

  const selectedProfessional = useMemo(
    () => professionals.find((item) => item.id === professionalId),
    [professionalId, professionals]
  );

  const selectedSpecialty = useMemo(
    () => specialties.find((item) => item.id === specialtyId),
    [specialtyId, specialties]
  );

  const filteredSpecialties = useMemo(() => {
    if (!selectedProfessional) return specialties;
    const allowed = new Set(selectedProfessional.specialtyIds);
    return specialties.filter((item) => allowed.has(item.id));
  }, [selectedProfessional, specialties]);

  const filteredProfessionals = useMemo(() => {
    if (!selectedSpecialty) return professionals;
    const allowed = new Set(selectedSpecialty.professionalIds);
    return professionals.filter((item) => allowed.has(item.id));
  }, [selectedSpecialty, professionals]);

  const isValidCombination = Boolean(
    selectedProfessional && selectedSpecialty && selectedProfessional.specialtyIds.includes(selectedSpecialty.id)
  );

  const canSearchAvailability = Boolean(accessToken && professionalId && specialtyId && isValidCombination && !catalogLoading);

  const slotsByStart = useMemo(() => new Map(slots.map((slot) => [slot.startsAtIso, slot])), [slots]);

  const getDoubleEndSlot = (slot: BookableSlot): BookableSlot | undefined => slotsByStart.get(slot.endsAtIso);

  const selectedProfessionalName = selectedProfessional?.displayName ?? '-';
  const selectedSpecialtyName = selectedSpecialty?.name ?? '-';

  const clearDependentAvailability = (): void => {
    setSlots([]);
    setConfirmedAppointment(null);
    setMessage('');
  };

  const handleProfessionalChange = (nextProfessionalId: string): void => {
    const nextProfessional = professionals.find((item) => item.id === nextProfessionalId);
    setProfessionalId(nextProfessionalId);
    setSelectionNotice('');
    clearDependentAvailability();

    if (specialtyId && nextProfessional && !nextProfessional.specialtyIds.includes(specialtyId)) {
      setSpecialtyId('');
      setSelectionNotice('La especialidad seleccionada no corresponde al nuevo profesional. Elegí una especialidad válida.');
    }
  };

  const handleSpecialtyChange = (nextSpecialtyId: string): void => {
    const nextSpecialty = specialties.find((item) => item.id === nextSpecialtyId);
    setSpecialtyId(nextSpecialtyId);
    setSelectionNotice('');
    clearDependentAvailability();

    if (professionalId && nextSpecialty && !nextSpecialty.professionalIds.includes(professionalId)) {
      setProfessionalId('');
      setSelectionNotice('El profesional seleccionado no atiende la nueva especialidad. Elegí un profesional válido.');
    }
  };

  const catalogEmptyMessage = !catalogLoading && professionals.length === 0
    ? 'Este centro no tiene profesionales activos configurados.'
    : !catalogLoading && specialties.length === 0
      ? 'Este centro no tiene especialidades activas configuradas.'
      : '';

  const specialtyEmptyMessage = selectedProfessional && filteredSpecialties.length === 0
    ? 'Este profesional no tiene especialidades configuradas.'
    : '';

  const professionalEmptyMessage = selectedSpecialty && filteredProfessionals.length === 0
    ? 'No hay profesionales disponibles para esta especialidad.'
    : '';

  return (
    <main className="nx-page nx-page--book">
      <Card
        title="Reserva online"
        subtitle="Encontrá horarios disponibles y reservá tu turno en pocos pasos."
        className="nx-book-shell"
      >
        <p className="nx-book-help">Elegí un profesional o una especialidad para ver solo opciones compatibles del centro.</p>
        {catalogLoading ? <p className="nx-book-status">Cargando profesionales y especialidades...</p> : null}
        {catalogEmptyMessage ? <p className="nx-book-status nx-book-status--warning">{catalogEmptyMessage}</p> : null}

        <div className="nx-form-grid nx-book-grid">
          <label className="nx-field">
            <span>Profesional</span>
            <select
              value={professionalId}
              onChange={(event) => handleProfessionalChange(event.target.value)}
              disabled={catalogLoading || professionals.length === 0 || filteredProfessionals.length === 0}
            >
              <option value="">Seleccioná un profesional</option>
              {filteredProfessionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
            {professionalEmptyMessage ? <small className="nx-book-field-message">{professionalEmptyMessage}</small> : null}
          </label>

          <label className="nx-field">
            <span>Especialidad</span>
            <select
              value={specialtyId}
              onChange={(event) => handleSpecialtyChange(event.target.value)}
              disabled={catalogLoading || specialties.length === 0 || filteredSpecialties.length === 0}
            >
              <option value="">Seleccioná una especialidad</option>
              {filteredSpecialties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {specialtyEmptyMessage ? <small className="nx-book-field-message">{specialtyEmptyMessage}</small> : null}
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
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                clearDependentAvailability();
              }}
            />
          </label>

          <label className="nx-field">
            <span>Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                clearDependentAvailability();
              }}
            />
          </label>
        </div>

        {selectionNotice ? <p className="nx-book-status nx-book-status--info">{selectionNotice}</p> : null}
        {!catalogEmptyMessage && !professionalId && !specialtyId ? (
          <p className="nx-book-status">Podés empezar por profesional o por especialidad.</p>
        ) : null}
        {professionalId && specialtyId && !isValidCombination ? (
          <p className="nx-book-status nx-book-status--warning">El profesional seleccionado no atiende la especialidad elegida.</p>
        ) : null}

        <section className="nx-book-duration" aria-labelledby="appointment-duration-title">
          <div>
            <h3 id="appointment-duration-title">Duración del turno</h3>
            <p>Elegí turno simple o doble antes de confirmar. El doble requiere dos bloques consecutivos libres.</p>
          </div>
          <div className="nx-book-duration__options" role="radiogroup" aria-label="Duración del turno">
            {[
              { value: 1 as const, title: 'Turno simple', detail: 'Ocupa el bloque normal disponible.' },
              { value: 2 as const, title: 'Turno doble', detail: 'Ocupa dos bloques consecutivos.' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`nx-book-duration__option ${durationMultiplier === option.value ? 'is-selected' : ''}`.trim()}
                role="radio"
                aria-checked={durationMultiplier === option.value}
                onClick={() => setDurationMultiplier(option.value)}
              >
                <strong>{option.title}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="nx-book-actions">
          <button
            type="button"
            className="nx-btn"
            disabled={!canSearchAvailability || availabilityLoading}
            onClick={async () => {
              if (!canSearchAvailability) {
                setError('Seleccioná un profesional y una especialidad compatibles antes de buscar disponibilidad.');
                return;
              }

              try {
                setError('');
                setAvailabilityLoading(true);
                const availability = await patientApi.getAvailability(accessToken!, organizationId, {
                  professionalId,
                  specialtyId,
                  startDate,
                  endDate
                });
                setSlots(availability.days.flatMap((day) => day.slots));
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setAvailabilityLoading(false);
              }
            }}
          >
            {availabilityLoading ? 'Buscando...' : 'Buscar disponibilidad'}
          </button>

          <p className="nx-book-selected">
            <strong>Profesional:</strong> {selectedProfessionalName} · <strong>Especialidad:</strong> {selectedSpecialtyName}
          </p>
        </div>

        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {message ? <p style={{ color: 'var(--success)' }}>{message}</p> : null}
        {confirmedAppointment?.organization ? (
          <OrganizationLocationCard organization={confirmedAppointment.organization} />
        ) : null}
        {!availabilityLoading && canSearchAvailability && slots.length === 0 ? (
          <p className="nx-book-status">Buscá disponibilidad para ver horarios compatibles.</p>
        ) : null}

        <ul className="nx-doctor-list">
          {slots.map((slot) => {
            const doubleEndSlot = getDoubleEndSlot(slot);
            const canBookSelectedDuration = durationMultiplier === 1 || Boolean(doubleEndSlot);
            const selectedEndAt = durationMultiplier === 2 && doubleEndSlot ? doubleEndSlot.endsAtIso : slot.endsAtIso;
            const selectedEndTime = durationMultiplier === 2 && doubleEndSlot ? doubleEndSlot.endTime : slot.endTime;
            const estimatedMinutes = slotDurationMinutes(slot) * durationMultiplier;

            return (
              <li key={slot.startsAtIso} className="nx-doctor-card">
                <div className="nx-doctor-card__top">
                  <span className="nx-doctor-card__avatar" aria-hidden="true">
                    🩺
                  </span>
                  <div>
                    <p className="nx-doctor-card__name">{selectedProfessionalName}</p>
                    <span className="nx-badge">
                      {slot.startTime}–{selectedEndTime}
                    </span>
                  </div>
                </div>

                <p className="nx-doctor-card__description">
                  {slot.startsAtIso.slice(0, 16).replace('T', ' ')} · {selectedSpecialtyName} · Duración estimada: {estimatedMinutes} min
                </p>

                <div className="nx-doctor-card__meta">
                  <span>Confirmación inmediata</span>
                  <span>Reserva online</span>
                  <span>{durationMultiplier === 2 ? 'Turno doble' : 'Turno simple'}</span>
                </div>

                {!canBookSelectedDuration ? (
                  <p className="nx-book-slot-warning">
                    Este horario no permite turno doble porque no hay disponibilidad suficiente.
                  </p>
                ) : null}

                <div className="nx-doctor-card__actions">
                  <button
                    type="button"
                    className="nx-btn"
                    disabled={!canBookSelectedDuration || !isValidCombination}
                    onClick={async () => {
                      if (!accessToken) {
                        return;
                      }

                      try {
                        setError('');
                        if (!isValidCombination) {
                          setError('Seleccioná un profesional y una especialidad compatibles antes de reservar.');
                          return;
                        }
                        if (beneficiaryType === 'family_member' && !familyMemberId) {
                          setError('Seleccioná un familiar activo antes de reservar.');
                          return;
                        }
                        const selectedFamilyMember = familyMembers.find((item) => item.id === familyMemberId);
                        const appointment = await patientApi.createAppointment(accessToken, organizationId, {
                          professionalId,
                          specialtyId,
                          startAt: slot.startsAtIso,
                          endAt: selectedEndAt,
                          durationMultiplier,
                          beneficiaryType,
                          ...(beneficiaryType === 'family_member' && selectedFamilyMember ? { familyMemberId, patientProfileId: selectedFamilyMember.patientProfileId } : {})
                        });
                        setMessage(`Turno reservado con éxito para ${appointment.beneficiaryDisplayName ?? appointment.patientName}.`);
                        setConfirmedAppointment(appointment);
                        setSlots((prev) =>
                          prev.filter((current) => current.startsAtIso !== slot.startsAtIso && current.startsAtIso !== slot.endsAtIso)
                        );
                      } catch (cause) {
                        setError((cause as Error).message);
                      }
                    }}
                  >
                    {durationMultiplier === 2 ? 'Reservar turno doble' : 'Reservar turno simple'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </main>
  );
};
