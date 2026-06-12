import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  AppointmentDto,
  AvailabilitySlotDto,
  JoinOrganizationPreviewDto,
  OrganizationHealthInsuranceDto,
} from "@starter/shared-types";
import { Card } from "@starter/ui";
import { useParams } from "react-router-dom";
import {
  PatientApiError,
  patientApi,
  type ExpressMaskedPatient,
  type PatientCatalog,
} from "./patient-api";

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayKey = (): string => toDateInputValue(new Date());
const toApiDate = (dateInputValue: string): string => dateInputValue;
const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

type ExpressForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  documentNumber: string;
  birthDate: string;
  coverageType: "private" | "health_insurance";
  healthInsuranceId: string;
  insuranceMemberNumber: string;
  insurancePlan: string;
  reason: string;
};

const emptyForm: ExpressForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  documentNumber: "",
  birthDate: "",
  coverageType: "private",
  healthInsuranceId: "",
  insuranceMemberNumber: "",
  insurancePlan: "",
  reason: "",
};

type SavedCoverageInput = {
  type: "private" | "health_insurance";
  healthInsuranceId: string | null;
  healthInsuranceName: string | null;
  insuranceMemberNumber: string | null;
  insurancePlan: string | null;
};

type CoverageSelectionResult = {
  form: ExpressForm;
  inactiveMessage: string;
  prefillMessage: string;
};

const applySavedCoverageToForm = (
  currentForm: ExpressForm,
  coverage: SavedCoverageInput | undefined,
  healthInsurances: OrganizationHealthInsuranceDto[],
): CoverageSelectionResult => {
  if (healthInsurances.length === 0) {
    return {
      form: {
        ...currentForm,
        coverageType: "private",
        healthInsuranceId: "",
        insuranceMemberNumber: "",
        insurancePlan: "",
      },
      inactiveMessage: "",
      prefillMessage:
        "Este centro no tiene obras sociales configuradas para reserva online.",
    };
  }

  if (coverage?.type === "health_insurance" && coverage.healthInsuranceId) {
    const savedHealthInsurance = healthInsurances.find(
      (item) => item.id === coverage.healthInsuranceId,
    );
    if (savedHealthInsurance) {
      return {
        form: {
          ...currentForm,
          coverageType: "health_insurance",
          healthInsuranceId: coverage.healthInsuranceId,
          insuranceMemberNumber: coverage.insuranceMemberNumber ?? "",
          insurancePlan: coverage.insurancePlan ?? "",
        },
        inactiveMessage: "",
        prefillMessage: coverage.healthInsuranceName
          ? `Preseleccionamos tu cobertura guardada: ${coverage.healthInsuranceName}.`
          : "",
      };
    }

    return {
      form: {
        ...currentForm,
        coverageType: "private",
        healthInsuranceId: "",
        insuranceMemberNumber: "",
        insurancePlan: "",
      },
      inactiveMessage:
        "Tu obra social guardada ya no está disponible para este centro. Podés elegir otra cobertura.",
      prefillMessage: "",
    };
  }

  return {
    form: {
      ...currentForm,
      coverageType: "private",
      healthInsuranceId: "",
      insuranceMemberNumber: "",
      insurancePlan: "",
    },
    inactiveMessage: "",
    prefillMessage: "",
  };
};

type PatientPersonalFieldsProps = {
  form: ExpressForm;
  onChange: (form: ExpressForm) => void;
};

const PatientPersonalFields = ({
  form,
  onChange,
}: PatientPersonalFieldsProps): ReactElement => (
  <>
    <h2>Datos personales</h2>
    <label>
      Nombre *
      <input
        required
        value={form.firstName}
        onChange={(event) =>
          onChange({ ...form, firstName: event.target.value })
        }
      />
    </label>
    <label>
      Apellido *
      <input
        required
        value={form.lastName}
        onChange={(event) =>
          onChange({ ...form, lastName: event.target.value })
        }
      />
    </label>
    <label>
      Teléfono / WhatsApp *
      <input
        required
        value={form.phone}
        onChange={(event) => onChange({ ...form, phone: event.target.value })}
      />
    </label>
    <label>
      DNI
      <input
        value={form.documentNumber}
        onChange={(event) =>
          onChange({ ...form, documentNumber: event.target.value })
        }
      />
    </label>
    <label>
      Email
      <input
        type="email"
        value={form.email}
        onChange={(event) => onChange({ ...form, email: event.target.value })}
      />
    </label>
    <label>
      Fecha de nacimiento
      <input
        type="date"
        value={form.birthDate}
        onChange={(event) =>
          onChange({ ...form, birthDate: event.target.value })
        }
      />
    </label>
  </>
);

type CoverageFieldsProps = {
  form: ExpressForm;
  healthInsurances: OrganizationHealthInsuranceDto[];
  selectedHealthInsurance: OrganizationHealthInsuranceDto | undefined;
  inactiveCoverageMessage: string;
  onChange: (form: ExpressForm) => void;
};

const CoverageFields = ({
  form,
  healthInsurances,
  selectedHealthInsurance,
  inactiveCoverageMessage,
  onChange,
}: CoverageFieldsProps): ReactElement => {
  const canUseHealthInsurance = healthInsurances.length > 0;
  return (
    <section
      aria-labelledby="coverage-title"
      style={{
        border: "1px solid #dbe4ef",
        borderRadius: 12,
        padding: "1rem",
        display: "grid",
        gap: ".75rem",
      }}
    >
      <div>
        <h2 id="coverage-title">Cobertura del turno</h2>
        <p>¿Cómo vas a atenderte?</p>
      </div>
      {inactiveCoverageMessage ? <p>{inactiveCoverageMessage}</p> : null}
      {!canUseHealthInsurance ? (
        <p>
          Este centro no tiene obras sociales configuradas para reserva online.
        </p>
      ) : null}
      <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        <input
          type="radio"
          name="coverageType"
          checked={form.coverageType === "private"}
          onChange={() =>
            onChange({
              ...form,
              coverageType: "private",
              healthInsuranceId: "",
              insuranceMemberNumber: "",
              insurancePlan: "",
            })
          }
        />
        <span>Particular</span>
      </label>
      {canUseHealthInsurance ? (
        <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <input
            type="radio"
            name="coverageType"
            checked={form.coverageType === "health_insurance"}
            onChange={() =>
              onChange({
                ...form,
                coverageType: "health_insurance",
                healthInsuranceId:
                  form.healthInsuranceId || healthInsurances[0]?.id || "",
              })
            }
          />
          <span>Obra social</span>
        </label>
      ) : null}
      {canUseHealthInsurance && form.coverageType === "health_insurance" ? (
        <>
          <label>
            Obra social *
            <select
              required
              value={form.healthInsuranceId}
              onChange={(event) =>
                onChange({ ...form, healthInsuranceId: event.target.value })
              }
            >
              <option value="" disabled>
                Seleccionar obra social
              </option>
              {healthInsurances.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Número de afiliado
            <input
              required={selectedHealthInsurance?.requiresMemberNumber}
              value={form.insuranceMemberNumber}
              onChange={(event) =>
                onChange({ ...form, insuranceMemberNumber: event.target.value })
              }
            />
          </label>
          <label>
            Plan
            <input
              required={selectedHealthInsurance?.requiresPlan}
              value={form.insurancePlan}
              onChange={(event) =>
                onChange({ ...form, insurancePlan: event.target.value })
              }
            />
          </label>
        </>
      ) : null}
    </section>
  );
};

export const JoinPage = (): ReactElement => {
  const { tokenOrSlug = "" } = useParams();
  const [preview, setPreview] = useState<JoinOrganizationPreviewDto | null>(
    null,
  );
  const [catalog, setCatalog] = useState<PatientCatalog>({
    professionals: [],
    specialties: [],
  });
  const [healthInsurances, setHealthInsurances] = useState<
    OrganizationHealthInsuranceDto[]
  >([]);
  const [specialtyId, setSpecialtyId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotDto | null>(
    null,
  );
  const [form, setForm] = useState<ExpressForm>(emptyForm);
  const [confirmation, setConfirmation] = useState<AppointmentDto | null>(null);
  const [expressPatient, setExpressPatient] =
    useState<ExpressMaskedPatient | null>(null);
  const [selectedPatientMode, setSelectedPatientMode] = useState<
    "lookup" | "known" | "other"
  >("lookup");
  const [bookingMode, setBookingMode] = useState<
    "manual" | "saved_by_lookup" | "current_express_session"
  >("manual");
  const [expressSessionLoading, setExpressSessionLoading] = useState(true);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResult, setLookupResult] = useState<ExpressMaskedPatient | null>(
    null,
  );
  const [patientLookupToken, setPatientLookupToken] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [prefillAccepted, setPrefillAccepted] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState("");
  const [inactiveCoverageMessage, setInactiveCoverageMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        setExpressSessionLoading(true);
        const [previewData, catalogData, coverageData, sessionData] =
          await Promise.all([
            patientApi.getJoinPreview(tokenOrSlug),
            patientApi.getPublicCatalog(tokenOrSlug),
            patientApi.getPublicHealthInsurances(tokenOrSlug),
            patientApi
              .getPatientSession(tokenOrSlug)
              .catch(() => ({ authenticated: false as const })),
          ]);
        setPreview(previewData);
        setCatalog(catalogData);
        setHealthInsurances(coverageData);
        if (sessionData.authenticated) {
          setExpressPatient(sessionData.patient);
          setSelectedPatientMode("known");
          setBookingMode("current_express_session");
          const coverageSelection = applySavedCoverageToForm(
            emptyForm,
            sessionData.patient.coverage,
            coverageData,
          );
          setForm(coverageSelection.form);
          setPrefillMessage(coverageSelection.prefillMessage);
          setInactiveCoverageMessage(coverageSelection.inactiveMessage);
        } else {
          setExpressPatient(null);
          setSelectedPatientMode("lookup");
          setBookingMode("manual");
        }
        const firstSpecialty = catalogData.specialties[0];
        if (firstSpecialty) {
          setSpecialtyId(firstSpecialty.id);
          setProfessionalId(firstSpecialty.professionalIds[0] ?? "");
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
        setExpressSessionLoading(false);
      }
    })();
  }, [tokenOrSlug]);

  const professionalsForSpecialty = useMemo(() => {
    const specialty = catalog.specialties.find(
      (item) => item.id === specialtyId,
    );
    const ids = new Set(specialty?.professionalIds ?? []);
    return catalog.professionals.filter((professional) =>
      ids.has(professional.id),
    );
  }, [catalog.professionals, catalog.specialties, specialtyId]);

  useEffect(() => {
    if (!specialtyId) return;
    if (
      !professionalsForSpecialty.some(
        (professional) => professional.id === professionalId,
      )
    ) {
      setProfessionalId(professionalsForSpecialty[0]?.id ?? "");
    }
  }, [professionalId, professionalsForSpecialty, specialtyId]);

  useEffect(() => {
    if (!professionalId || !specialtyId || !date) {
      setSlots([]);
      return;
    }
    void (async () => {
      setLoadingAvailability(true);
      setError("");
      setSelectedSlot(null);
      try {
        const apiDate = toApiDate(date);
        const availability = await patientApi.getPublicAvailability(
          tokenOrSlug,
          { professionalId, specialtyId, startDate: apiDate, endDate: apiDate },
        );
        setSlots(
          availability.days
            .flatMap((day) => day.slots)
            .filter((slot) => slot.available),
        );
      } catch (cause) {
        setError(
          cause instanceof PatientApiError && cause.status === 400
            ? "No pudimos cargar la disponibilidad para esa fecha. Revisá especialidad, profesional y fecha."
            : (cause as Error).message ||
                "No pudimos cargar la disponibilidad para esa fecha. Revisá especialidad, profesional y fecha.",
        );
        setSlots([]);
      } finally {
        setLoadingAvailability(false);
      }
    })();
  }, [date, professionalId, specialtyId, tokenOrSlug]);

  const selectedHealthInsurance = healthInsurances.find(
    (item) => item.id === form.healthInsuranceId,
  );
  const centerName =
    preview?.organization.displayName ??
    preview?.organization.name ??
    "el centro";
  const selectedProfessional = catalog.professionals.find(
    (item) => item.id === professionalId,
  );
  const selectedSpecialty = catalog.specialties.find(
    (item) => item.id === specialtyId,
  );
  const coverageLabel =
    form.coverageType === "private"
      ? "Particular"
      : (selectedHealthInsurance?.name ?? "Obra social");
  const usingKnownExpressPatient =
    bookingMode === "current_express_session" && Boolean(expressPatient);
  const usingSavedLookupPatient =
    bookingMode === "saved_by_lookup" &&
    Boolean(lookupResult) &&
    Boolean(patientLookupToken);
  const showFullPatientForm = bookingMode === "manual";

  const buildCoverageInput = () =>
    form.coverageType === "health_insurance"
      ? {
          type: "health_insurance" as const,
          healthInsuranceId: form.healthInsuranceId,
          insuranceMemberNumber: form.insuranceMemberNumber || null,
          insurancePlan: form.insurancePlan || null,
        }
      : {
          type: "private" as const,
          healthInsuranceId: null,
          insuranceMemberNumber: null,
          insurancePlan: null,
        };

  const lookupPatient = async (): Promise<void> => {
    setLookupLoading(true);
    setLookupMessage("");
    setPrefillMessage("");
    setInactiveCoverageMessage("");
    setPrefillAccepted(false);
    setLookupResult(null);
    setPatientLookupToken("");
    setBookingMode("manual");
    setError("");
    try {
      const result = await patientApi.lookupExpressPatient(tokenOrSlug, {
        phone: lookupPhone,
      });
      setForm({ ...emptyForm, phone: lookupPhone });
      if (!result.found) {
        setLookupMessage(
          "No encontramos datos con ese WhatsApp. Podés completar el formulario.",
        );
        setSelectedPatientMode("other");
        setBookingMode("manual");
        return;
      }
      setLookupResult(result.maskedPatient);
      setPatientLookupToken(result.lookupToken);
      setLookupMessage(
        "Encontramos tus datos guardados. Si aceptás usarlos, reservamos sin pedirte el formulario completo.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleSavedLookupBooking = (checked: boolean): void => {
    setPrefillAccepted(checked);
    setPrefillMessage("");
    setInactiveCoverageMessage("");
    setError("");
    setBookingMode(checked ? "saved_by_lookup" : "manual");
    setForm({ ...emptyForm, phone: lookupPhone });

    if (!checked) return;

    void (async () => {
      setPrefillLoading(true);
      try {
        const prefill = await patientApi.prefillExpressPatient(tokenOrSlug, {
          phone: lookupPhone,
          acceptSavedData: true,
        });
        if (!prefill.found) {
          setPrefillAccepted(false);
          setBookingMode("manual");
          setPrefillMessage(
            "No pudimos traer tus datos guardados. Completá el formulario manual.",
          );
          return;
        }

        const coverageSelection = applySavedCoverageToForm(
          { ...emptyForm, phone: lookupPhone },
          prefill.patient.coverage,
          healthInsurances,
        );
        setForm(coverageSelection.form);
        setPrefillMessage(
          coverageSelection.prefillMessage ||
            "Usaremos tus datos guardados para reservar. Podés confirmar o cambiar la cobertura de este turno.",
        );
        setInactiveCoverageMessage(coverageSelection.inactiveMessage);
      } catch (cause) {
        setPrefillAccepted(false);
        setBookingMode("manual");
        setError((cause as Error).message);
      } finally {
        setPrefillLoading(false);
      }
    })();
  };

  const confirmKnownExpressPatient = (): void => {
    setSelectedPatientMode("known");
    setBookingMode("current_express_session");
    setError("");
  };

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = usingKnownExpressPatient
        ? {
            professionalId,
            specialtyId,
            startAt: selectedSlot.startsAtIso,
            endAt: selectedSlot.endsAtIso,
            useCurrentExpressPatient: true,
            coverage: buildCoverageInput(),
          }
        : usingSavedLookupPatient
          ? {
              professionalId,
              specialtyId,
              startAt: selectedSlot.startsAtIso,
              endAt: selectedSlot.endsAtIso,
              useSavedPatientData: true,
              patientLookupToken,
              coverage: buildCoverageInput(),
            }
          : {
              professionalId,
              specialtyId,
              startAt: selectedSlot.startsAtIso,
              endAt: selectedSlot.endsAtIso,
              patient: {
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone,
                ...(form.email ? { email: form.email } : {}),
                ...(form.documentNumber
                  ? { documentNumber: form.documentNumber }
                  : {}),
                ...(form.birthDate ? { birthDate: form.birthDate } : {}),
              },
              coverage: buildCoverageInput(),
              ...(form.reason ? { reason: form.reason } : {}),
            };
      const appointment = await patientApi.createExpressAppointment(
        tokenOrSlug,
        payload,
      );
      setConfirmation(appointment);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation && selectedSlot) {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "1rem" }}>
        <Card
          title="Turno reservado correctamente"
          subtitle="Te enviaremos la confirmación y recordatorio por WhatsApp."
        >
          <dl className="nx-appointment-detail__summary">
            <div>
              <dt>Paciente</dt>
              <dd>
                {usingKnownExpressPatient
                  ? expressPatient?.displayName
                  : usingSavedLookupPatient
                    ? lookupResult?.displayName
                    : `${form.firstName} ${form.lastName}`.trim()}
              </dd>
            </div>
            <div>
              <dt>Centro</dt>
              <dd>{centerName}</dd>
            </div>
            <div>
              <dt>Profesional</dt>
              <dd>
                {selectedProfessional?.displayName ??
                  confirmation.professionalId}
              </dd>
            </div>
            <div>
              <dt>Especialidad</dt>
              <dd>{selectedSpecialty?.name ?? confirmation.specialtyId}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatDate(confirmation.startAt)}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{formatTime(confirmation.startAt)}</dd>
            </div>
            <div>
              <dt>Cobertura</dt>
              <dd>
                {confirmation.healthInsuranceName ??
                  (usingSavedLookupPatient || usingKnownExpressPatient
                    ? "Cobertura guardada o Particular"
                    : coverageLabel)}
              </dd>
            </div>
          </dl>
          <p>La próxima vez podremos reconocerte para reservar más rápido.</p>
        </Card>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "2rem auto", padding: "1rem" }}>
      <Card
        title={`Reservar turno en ${centerName}`}
        subtitle="Elegí primero especialidad, profesional, fecha y horario. Después te pediremos solo los datos mínimos."
      >
        {loading ? <p>Cargando agenda pública...</p> : null}
        {error ? (
          <p role="alert" className="nx-join__error">
            {error}
          </p>
        ) : null}
        {preview && !loading ? (
          <section style={{ display: "grid", gap: "1.5rem" }}>
            <div>
              <p>
                <strong>{centerName}</strong>
              </p>
              {[
                preview.organization.address,
                preview.organization.city,
                preview.organization.province,
              ]
                .filter(Boolean)
                .join(", ") ? (
                <p>
                  {[
                    preview.organization.address,
                    preview.organization.city,
                    preview.organization.province,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {preview.organization.phone ? (
                <p>Teléfono: {preview.organization.phone}</p>
              ) : null}
              {preview.organization.locationLabel ? (
                <p>Ubicación: {preview.organization.locationLabel}</p>
              ) : null}
              <p>
                Especialidades disponibles:{" "}
                {catalog.specialties.map((item) => item.name).join(", ") ||
                  "Sin especialidades activas"}
              </p>
            </div>

            <section
              aria-label="Selección de turno"
              style={{ display: "grid", gap: "1rem" }}
            >
              <label>
                Especialidad
                <select
                  value={specialtyId}
                  onChange={(event) => setSpecialtyId(event.target.value)}
                >
                  {catalog.specialties.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Profesional
                <select
                  value={professionalId}
                  onChange={(event) => setProfessionalId(event.target.value)}
                >
                  {professionalsForSpecialty.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  value={date}
                  min={todayKey()}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <div>
                <strong>Horario</strong>
                {loadingAvailability ? (
                  <p>Buscando disponibilidad real...</p>
                ) : null}
                {!loadingAvailability && slots.length === 0 ? (
                  <p>No hay horarios disponibles para esta fecha.</p>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: ".5rem",
                    marginTop: ".5rem",
                  }}
                >
                  {slots.map((slot) => (
                    <button
                      type="button"
                      key={slot.startsAtIso}
                      className="nx-btn"
                      onClick={() => setSelectedSlot(slot)}
                      aria-pressed={
                        selectedSlot?.startsAtIso === slot.startsAtIso
                      }
                    >
                      {formatTime(slot.startsAtIso)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {selectedSlot ? (
              <form
                onSubmit={(event) => void submit(event)}
                style={{ display: "grid", gap: "1rem" }}
              >
                {expressSessionLoading ? (
                  <section
                    style={{
                      border: "1px solid #dbe4ef",
                      borderRadius: 12,
                      padding: "1rem",
                    }}
                  >
                    <p>
                      Buscando si ya tenemos tus datos en este dispositivo...
                    </p>
                  </section>
                ) : null}

                {!expressSessionLoading &&
                expressPatient &&
                selectedPatientMode !== "other" ? (
                  <section
                    style={{
                      border: "1px solid #dbe4ef",
                      borderRadius: 12,
                      padding: "1rem",
                      display: "grid",
                      gap: ".75rem",
                    }}
                  >
                    <div>
                      <h2>Detectamos tus datos</h2>
                      <p>
                        {expressPatient.displayName} · WhatsApp terminado en{" "}
                        {expressPatient.maskedPhone.slice(-4)}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: ".75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="nx-btn"
                        disabled={submitting}
                        onClick={confirmKnownExpressPatient}
                      >
                        Sí, soy yo
                      </button>
                      <button
                        type="button"
                        className="nx-btn nx-btn--secondary"
                        onClick={() => {
                          setSelectedPatientMode("other");
                          setBookingMode("manual");
                        }}
                      >
                        Usar otros datos
                      </button>
                    </div>
                  </section>
                ) : null}

                {!expressSessionLoading &&
                !expressPatient &&
                selectedPatientMode === "lookup" ? (
                  <section
                    style={{
                      border: "1px solid #dbe4ef",
                      borderRadius: 12,
                      padding: "1rem",
                      display: "grid",
                      gap: ".75rem",
                    }}
                  >
                    <h2>¿Ya reservaste antes?</h2>
                    <p>Ingresá tu WhatsApp para buscar tus datos.</p>
                    <label>
                      WhatsApp
                      <input
                        value={lookupPhone}
                        onChange={(event) => {
                          const nextPhone = event.target.value;
                          setLookupPhone(nextPhone);
                          setLookupResult(null);
                          setPrefillAccepted(false);
                          setBookingMode("manual");
                          setPatientLookupToken("");
                          setPrefillMessage("");
                          setInactiveCoverageMessage("");
                          setForm({ ...emptyForm, phone: nextPhone });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="nx-btn"
                      disabled={lookupLoading || !lookupPhone}
                      onClick={() => void lookupPatient()}
                    >
                      {lookupLoading ? "Buscando..." : "Buscar mis datos"}
                    </button>
                    {lookupMessage ? <p>{lookupMessage}</p> : null}
                    {lookupResult ? (
                      <div style={{ display: "grid", gap: ".75rem" }}>
                        <div>
                          <p>
                            <strong>Encontramos tus datos guardados</strong>
                          </p>
                          <p>
                            {lookupResult.displayName} · WhatsApp terminado en{" "}
                            {lookupResult.maskedPhone.slice(-4)}
                          </p>
                        </div>
                        <label
                          style={{
                            display: "flex",
                            gap: ".5rem",
                            alignItems: "flex-start",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={prefillAccepted}
                            disabled={!patientLookupToken}
                            onChange={(event) =>
                              toggleSavedLookupBooking(event.target.checked)
                            }
                          />
                          <span>
                            Usar mis datos guardados para reservar este turno
                          </span>
                        </label>
                        {usingSavedLookupPatient ? (
                          <p>
                            Usaremos tus datos guardados para reservar. No vamos
                            a pedirte nombre, apellido, DNI, email ni fecha de
                            nacimiento.
                          </p>
                        ) : (
                          <p>
                            Si no tildás el checkbox, completá el formulario
                            manual.
                          </p>
                        )}
                        {prefillLoading ? (
                          <p>Cargando datos guardados...</p>
                        ) : null}
                        {prefillMessage ? <p>{prefillMessage}</p> : null}
                        {inactiveCoverageMessage ? (
                          <p>{inactiveCoverageMessage}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {showFullPatientForm ? (
                  <PatientPersonalFields form={form} onChange={setForm} />
                ) : usingSavedLookupPatient ? (
                  <section>
                    <h2>Reserva con datos guardados</h2>
                    <p>
                      Reservás como {lookupResult?.displayName}. No vamos a
                      pedirte todos tus datos otra vez.
                    </p>
                  </section>
                ) : usingKnownExpressPatient ? (
                  <section>
                    <h2>Reserva con sesión express</h2>
                    <p>
                      Confirmá o cambiá la cobertura de este turno antes de
                      reservar.
                    </p>
                  </section>
                ) : null}

                <CoverageFields
                  form={form}
                  healthInsurances={healthInsurances}
                  selectedHealthInsurance={selectedHealthInsurance}
                  inactiveCoverageMessage={inactiveCoverageMessage}
                  onChange={(nextForm) => {
                    setInactiveCoverageMessage("");
                    setForm(nextForm);
                  }}
                />
                {showFullPatientForm ? (
                  <label>
                    Motivo de consulta
                    <textarea
                      value={form.reason}
                      onChange={(event) =>
                        setForm({ ...form, reason: event.target.value })
                      }
                    />
                  </label>
                ) : null}
                <button type="submit" className="nx-btn" disabled={submitting}>
                  {submitting ? "Confirmando..." : "Confirmar turno"}
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
      </Card>
    </main>
  );
};
