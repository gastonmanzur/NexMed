import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AppointmentDto, AvailabilitySlotDto, JoinOrganizationPreviewDto, OrganizationHealthInsuranceDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useParams } from 'react-router-dom';
import { patientApi, type PatientCatalog } from './patient-api';

const todayKey = (): string => new Date().toISOString().slice(0, 10);
const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });

type ExpressForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  documentNumber: string;
  birthDate: string;
  coverageType: 'private' | 'health_insurance';
  healthInsuranceId: string;
  insuranceMemberNumber: string;
  insurancePlan: string;
  reason: string;
};

const emptyForm: ExpressForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  documentNumber: '',
  birthDate: '',
  coverageType: 'private',
  healthInsuranceId: '',
  insuranceMemberNumber: '',
  insurancePlan: '',
  reason: ''
};

export const JoinPage = (): ReactElement => {
  const { tokenOrSlug = '' } = useParams();
  const [preview, setPreview] = useState<JoinOrganizationPreviewDto | null>(null);
  const [catalog, setCatalog] = useState<PatientCatalog>({ professionals: [], specialties: [] });
  const [healthInsurances, setHealthInsurances] = useState<OrganizationHealthInsuranceDto[]>([]);
  const [specialtyId, setSpecialtyId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState(todayKey());
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotDto | null>(null);
  const [form, setForm] = useState<ExpressForm>(emptyForm);
  const [confirmation, setConfirmation] = useState<AppointmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const [previewData, catalogData, coverageData] = await Promise.all([
          patientApi.getJoinPreview(tokenOrSlug),
          patientApi.getPublicCatalog(tokenOrSlug),
          patientApi.getPublicHealthInsurances(tokenOrSlug)
        ]);
        setPreview(previewData);
        setCatalog(catalogData);
        setHealthInsurances(coverageData);
        const firstSpecialty = catalogData.specialties[0];
        if (firstSpecialty) {
          setSpecialtyId(firstSpecialty.id);
          setProfessionalId(firstSpecialty.professionalIds[0] ?? '');
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenOrSlug]);

  const professionalsForSpecialty = useMemo(() => {
    const specialty = catalog.specialties.find((item) => item.id === specialtyId);
    const ids = new Set(specialty?.professionalIds ?? []);
    return catalog.professionals.filter((professional) => ids.has(professional.id));
  }, [catalog.professionals, catalog.specialties, specialtyId]);

  useEffect(() => {
    if (!specialtyId) return;
    if (!professionalsForSpecialty.some((professional) => professional.id === professionalId)) {
      setProfessionalId(professionalsForSpecialty[0]?.id ?? '');
    }
  }, [professionalId, professionalsForSpecialty, specialtyId]);

  useEffect(() => {
    if (!professionalId || !specialtyId || !date) {
      setSlots([]);
      return;
    }
    void (async () => {
      setLoadingAvailability(true);
      setError('');
      setSelectedSlot(null);
      try {
        const availability = await patientApi.getPublicAvailability(tokenOrSlug, { professionalId, specialtyId, startDate: date, endDate: date });
        setSlots(availability.days.flatMap((day) => day.slots).filter((slot) => slot.available));
      } catch (cause) {
        setError((cause as Error).message);
        setSlots([]);
      } finally {
        setLoadingAvailability(false);
      }
    })();
  }, [date, professionalId, specialtyId, tokenOrSlug]);

  const selectedHealthInsurance = healthInsurances.find((item) => item.id === form.healthInsuranceId);
  const centerName = preview?.organization.displayName ?? preview?.organization.name ?? 'el centro';
  const selectedProfessional = catalog.professionals.find((item) => item.id === professionalId);
  const selectedSpecialty = catalog.specialties.find((item) => item.id === specialtyId);
  const coverageLabel = form.coverageType === 'private' ? 'Particular' : selectedHealthInsurance?.name ?? 'Obra social';

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const appointment = await patientApi.createExpressAppointment(tokenOrSlug, {
        professionalId,
        specialtyId,
        startAt: selectedSlot.startsAtIso,
        endAt: selectedSlot.endsAtIso,
        patient: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          ...(form.email ? { email: form.email } : {}),
          ...(form.documentNumber ? { documentNumber: form.documentNumber } : {}),
          ...(form.birthDate ? { birthDate: form.birthDate } : {})
        },
        coverage: {
          type: form.coverageType,
          ...(form.coverageType === 'health_insurance' ? { healthInsuranceId: form.healthInsuranceId } : {}),
          ...(form.insuranceMemberNumber ? { insuranceMemberNumber: form.insuranceMemberNumber } : {}),
          ...(form.insurancePlan ? { insurancePlan: form.insurancePlan } : {})
        },
        ...(form.reason ? { reason: form.reason } : {})
      });
      setConfirmation(appointment);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation && selectedSlot) {
    return (
      <main style={{ maxWidth: 760, margin: '2rem auto', padding: '1rem' }}>
        <Card title="Turno reservado correctamente" subtitle="Te enviaremos la confirmación y recordatorio por WhatsApp.">
          <dl className="nx-appointment-detail__summary">
            <div><dt>Centro</dt><dd>{centerName}</dd></div>
            <div><dt>Profesional</dt><dd>{selectedProfessional?.displayName ?? confirmation.professionalId}</dd></div>
            <div><dt>Especialidad</dt><dd>{selectedSpecialty?.name ?? confirmation.specialtyId}</dd></div>
            <div><dt>Fecha</dt><dd>{formatDate(confirmation.startAt)}</dd></div>
            <div><dt>Hora</dt><dd>{formatTime(confirmation.startAt)}</dd></div>
            <div><dt>Obra social/Particular</dt><dd>{confirmation.healthInsuranceName ?? coverageLabel}</dd></div>
          </dl>
        </Card>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: '2rem auto', padding: '1rem' }}>
      <Card title={`Reservar turno en ${centerName}`} subtitle="Elegí primero especialidad, profesional, fecha y horario. Después te pediremos solo los datos mínimos.">
        {loading ? <p>Cargando agenda pública...</p> : null}
        {error ? <p role="alert" className="nx-join__error">{error}</p> : null}
        {preview && !loading ? (
          <section style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <p><strong>{centerName}</strong></p>
              {[preview.organization.address, preview.organization.city, preview.organization.province].filter(Boolean).join(', ') ? <p>{[preview.organization.address, preview.organization.city, preview.organization.province].filter(Boolean).join(', ')}</p> : null}
              {preview.organization.phone ? <p>Teléfono: {preview.organization.phone}</p> : null}
              {preview.organization.locationLabel ? <p>Ubicación: {preview.organization.locationLabel}</p> : null}
              <p>Especialidades disponibles: {catalog.specialties.map((item) => item.name).join(', ') || 'Sin especialidades activas'}</p>
            </div>

            <section aria-label="Selección de turno" style={{ display: 'grid', gap: '1rem' }}>
              <label>Especialidad
                <select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
                  {catalog.specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.name}</option>)}
                </select>
              </label>
              <label>Profesional
                <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
                  {professionalsForSpecialty.map((professional) => <option key={professional.id} value={professional.id}>{professional.displayName}</option>)}
                </select>
              </label>
              <label>Fecha
                <input type="date" value={date} min={todayKey()} onChange={(event) => setDate(event.target.value)} />
              </label>
              <div>
                <strong>Horario</strong>
                {loadingAvailability ? <p>Buscando disponibilidad real...</p> : null}
                {!loadingAvailability && slots.length === 0 ? <p>No hay horarios disponibles para esta fecha.</p> : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '.5rem' }}>
                  {slots.map((slot) => (
                    <button type="button" key={slot.startsAtIso} className="nx-btn" onClick={() => setSelectedSlot(slot)} aria-pressed={selectedSlot?.startsAtIso === slot.startsAtIso}>
                      {formatTime(slot.startsAtIso)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {selectedSlot ? (
              <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: '1rem' }}>
                <h2>Datos personales</h2>
                <label>Nombre *<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
                <label>Apellido *<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
                <label>Teléfono / WhatsApp *<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label>Obra social o Particular *
                  <select required value={form.coverageType === 'private' ? 'private' : form.healthInsuranceId} onChange={(event) => {
                    const value = event.target.value;
                    setForm({ ...form, coverageType: value === 'private' ? 'private' : 'health_insurance', healthInsuranceId: value === 'private' ? '' : value });
                  }}>
                    <option value="private">Particular</option>
                    {healthInsurances.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>DNI<input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} /></label>
                <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label>Fecha de nacimiento<input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
                {form.coverageType === 'health_insurance' ? <label>Número de afiliado<input required={selectedHealthInsurance?.requiresMemberNumber} value={form.insuranceMemberNumber} onChange={(event) => setForm({ ...form, insuranceMemberNumber: event.target.value })} /></label> : null}
                {form.coverageType === 'health_insurance' ? <label>Plan<input required={selectedHealthInsurance?.requiresPlan} value={form.insurancePlan} onChange={(event) => setForm({ ...form, insurancePlan: event.target.value })} /></label> : null}
                <label>Motivo de consulta<textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
                <button type="submit" className="nx-btn" disabled={submitting}>{submitting ? 'Confirmando...' : 'Confirmar turno'}</button>
              </form>
            ) : null}
          </section>
        ) : null}
      </Card>
    </main>
  );
};
