import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AppointmentDto, AvailabilitySlotDto, JoinOrganizationPreviewDto, OrganizationHealthInsuranceDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useParams } from 'react-router-dom';
import { PatientApiError, patientApi, type ExpressMaskedPatient, type PatientCatalog } from './patient-api';

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const todayKey = (): string => toDateInputValue(new Date());
const toApiDate = (dateInputValue: string): string => dateInputValue;
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
  const [expressPatient, setExpressPatient] = useState<ExpressMaskedPatient | null>(null);
  const [useExpressPatient, setUseExpressPatient] = useState(false);
  const [useOtherData, setUseOtherData] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<ExpressMaskedPatient | null>(null);
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
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
        const sessionData = await patientApi.getExpressSessionMe().catch(() => ({ authenticated: false as const }));
        setPreview(previewData);
        setCatalog(catalogData);
        setHealthInsurances(coverageData);
        if (sessionData.authenticated) setExpressPatient(sessionData.patient);
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
        const apiDate = toApiDate(date);
        const availability = await patientApi.getPublicAvailability(tokenOrSlug, { professionalId, specialtyId, startDate: apiDate, endDate: apiDate });
        setSlots(availability.days.flatMap((day) => day.slots).filter((slot) => slot.available));
      } catch (cause) {
        setError(cause instanceof PatientApiError && cause.status === 400
          ? 'No pudimos cargar la disponibilidad para esa fecha. Revisá especialidad, profesional y fecha.'
          : (cause as Error).message || 'No pudimos cargar la disponibilidad para esa fecha. Revisá especialidad, profesional y fecha.');
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
  const usingKnownExpressPatient = useExpressPatient && !useOtherData && Boolean(expressPatient);
  const showFullPatientForm = !usingKnownExpressPatient;
  const expressFirstName = expressPatient?.displayName.split(' ')[0] ?? 'paciente';

  const buildCoverageInput = () => form.coverageType === 'health_insurance'
    ? {
      type: 'health_insurance' as const,
      healthInsuranceId: form.healthInsuranceId,
      insuranceMemberNumber: form.insuranceMemberNumber || null,
      insurancePlan: form.insurancePlan || null
    }
    : {
      type: 'private' as const,
      healthInsuranceId: null,
      insuranceMemberNumber: null,
      insurancePlan: null
    };

  const lookupPatient = async (): Promise<void> => {
    setLookupLoading(true);
    setLookupMessage('');
    setLookupResult(null);
    setError('');
    try {
      const result = await patientApi.lookupExpressPatient(tokenOrSlug, { phone: lookupPhone });
      if (!result.found) {
        setLookupMessage('No encontramos datos con ese WhatsApp. Podés completar el formulario.');
        setUseOtherData(true);
        return;
      }
      setLookupResult(result.maskedPatient);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLookupLoading(false);
    }
  };

  const confirmLookupPatient = async (): Promise<void> => {
    setLookupLoading(true);
    setError('');
    try {
      const result = await patientApi.confirmExpressPatient(tokenOrSlug, { phone: lookupPhone, confirm: true });
      setExpressPatient(result.patient);
      setUseExpressPatient(true);
      setUseOtherData(false);
      setLookupResult(null);
      setLookupMessage('Identidad confirmada. Ya podés reservar sin completar tus datos nuevamente.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLookupLoading(false);
    }
  };

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
        ...(usingKnownExpressPatient
          ? { useCurrentExpressPatient: true }
          : {
            patient: {
              firstName: form.firstName,
              lastName: form.lastName,
              phone: form.phone,
              ...(form.email ? { email: form.email } : {}),
              ...(form.documentNumber ? { documentNumber: form.documentNumber } : {}),
              ...(form.birthDate ? { birthDate: form.birthDate } : {})
            }
          }),
        coverage: buildCoverageInput(),
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
            <div><dt>Paciente</dt><dd>{usingKnownExpressPatient ? expressPatient?.displayName : `${form.firstName} ${form.lastName}`.trim()}</dd></div>
            <div><dt>Centro</dt><dd>{centerName}</dd></div>
            <div><dt>Profesional</dt><dd>{selectedProfessional?.displayName ?? confirmation.professionalId}</dd></div>
            <div><dt>Especialidad</dt><dd>{selectedSpecialty?.name ?? confirmation.specialtyId}</dd></div>
            <div><dt>Fecha</dt><dd>{formatDate(confirmation.startAt)}</dd></div>
            <div><dt>Hora</dt><dd>{formatTime(confirmation.startAt)}</dd></div>
            <div><dt>Obra social/Particular</dt><dd>{confirmation.healthInsuranceName ?? coverageLabel}</dd></div>
          </dl>
          <p>La próxima vez podremos reconocerte para reservar más rápido.</p>
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
                {expressPatient && !useOtherData ? (
                  <section style={{ border: '1px solid #dbe4ef', borderRadius: 12, padding: '1rem', display: 'grid', gap: '.75rem' }}>
                    <div>
                      <h2>Detectamos tus datos</h2>
                      <p>{expressPatient.displayName} · WhatsApp terminado en {expressPatient.maskedPhone.slice(-4)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                      <button type="button" className="nx-btn" onClick={() => { setUseExpressPatient(true); setUseOtherData(false); }}>Reservar como {expressFirstName}</button>
                      <button type="button" className="nx-btn nx-btn--secondary" onClick={() => { setUseExpressPatient(false); setUseOtherData(true); }}>Usar otros datos</button>
                    </div>
                  </section>
                ) : null}

                {!expressPatient && !useOtherData ? (
                  <section style={{ border: '1px solid #dbe4ef', borderRadius: 12, padding: '1rem', display: 'grid', gap: '.75rem' }}>
                    <h2>¿Ya reservaste antes?</h2>
                    <p>Ingresá tu WhatsApp para buscar tus datos.</p>
                    <label>WhatsApp<input value={lookupPhone} onChange={(event) => setLookupPhone(event.target.value)} /></label>
                    <button type="button" className="nx-btn" disabled={lookupLoading || !lookupPhone} onClick={() => void lookupPatient()}>{lookupLoading ? 'Buscando...' : 'Buscar mis datos'}</button>
                    {lookupMessage ? <p>{lookupMessage}</p> : null}
                    {lookupResult ? (
                      <div style={{ display: 'grid', gap: '.75rem' }}>
                        <p>Encontramos: {lookupResult.displayName} · WhatsApp terminado en {lookupResult.maskedPhone.slice(-4)}</p>
                        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                          <button type="button" className="nx-btn" disabled={lookupLoading} onClick={() => void confirmLookupPatient()}>Sí, soy yo</button>
                          <button type="button" className="nx-btn nx-btn--secondary" onClick={() => { setLookupResult(null); setUseOtherData(true); }}>No soy yo</button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {showFullPatientForm ? (
                  <>
                    <h2>Datos personales</h2>
                    <label>Nombre *<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
                    <label>Apellido *<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
                    <label>Teléfono / WhatsApp *<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                    <label>DNI<input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} /></label>
                    <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                    <label>Fecha de nacimiento<input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
                  </>
                ) : (
                  <section>
                    <h2>Confirmá cobertura</h2>
                    <p>Reservás como {expressPatient?.displayName}. No vamos a pedirte todos tus datos otra vez.</p>
                  </section>
                )}

                <label>Obra social o Particular *
                  <select required value={form.coverageType === 'private' ? 'private' : form.healthInsuranceId} onChange={(event) => {
                    const value = event.target.value;
                    setForm({ ...form, coverageType: value === 'private' ? 'private' : 'health_insurance', healthInsuranceId: value === 'private' ? '' : value });
                  }}>
                    <option value="private">Particular</option>
                    {healthInsurances.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
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
