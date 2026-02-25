import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

import { listMyAppointments, publicAvailabilityByClinicIdWithFilters, rescheduleMyAppointment } from "../../api/appointments";
import { listMyClinics } from "../../api/patientClinics";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { BookingCalendar } from "../../components/booking/BookingCalendar";
import { DesktopSummaryCard } from "../../components/booking/DesktopSummaryCard";
import { MobileStickyBar } from "../../components/booking/MobileStickyBar";
import { SlotsList } from "../../components/booking/SlotsList";
import { addDays, BookingSlot, buildMapByDay, fromDateKey, toDateKey } from "../../components/booking/types";
import { useAuth } from "../../hooks/useAuth";
import { Appointment, PatientClinic } from "../../types";

const ALLOW_PROFESSIONAL_CHANGE = false;

function isUpcoming(startAt: string) {
  return new Date(startAt).getTime() >= Date.now();
}

export function PatientReschedulePage() {
  const { logout, token, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<PatientClinic[]>([]);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);

  const preselectedAppointmentId = useMemo(() => new URLSearchParams(window.location.search).get("appointmentId") ?? "", []);
  const today = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), []);
  const from = useMemo(() => toDateKey(today), [today]);
  const to = useMemo(() => toDateKey(addDays(today, 30)), [today]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const clinicById = useMemo(() => {
    const map = new Map<string, PatientClinic>();
    clinics.forEach((clinic) => map.set(clinic._id, clinic));
    return map;
  }, [clinics]);

  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) => isUpcoming(appointment.startAt)),
    [appointments]
  );
  const selectedAppointment = upcomingAppointments.find((appointment) => appointment._id === selectedAppointmentId);

  const groupedSlots = useMemo(() => buildMapByDay(slots), [slots]);
  const availableDays = useMemo(() => new Set(Object.keys(groupedSlots)), [groupedSlots]);
  const selectedDayKey = selectedDay ? toDateKey(selectedDay) : "";
  const selectedDaySlots = useMemo(() => (selectedDayKey ? groupedSlots[selectedDayKey] ?? [] : []), [groupedSlots, selectedDayKey]);
  const selectedSlotData = useMemo(() => slots.find((slot) => slot.startAt === selectedSlot), [slots, selectedSlot]);

  const loadData = async () => {
    if (!token) return;
    const [appointmentData, clinicData] = await Promise.all([listMyAppointments(token), listMyClinics(token)]);
    setAppointments(appointmentData);
    setClinics(clinicData);

    if (preselectedAppointmentId) return setSelectedAppointmentId(preselectedAppointmentId);
    const firstAvailable = appointmentData.find((a) => isUpcoming(a.startAt));
    if (firstAvailable) setSelectedAppointmentId(firstAvailable._id);
  };

  const loadAvailability = async () => {
    if (!selectedAppointment) return setSlots([]);
    setIsLoadingAvailability(true);
    setError("");
    try {
      const data = await publicAvailabilityByClinicIdWithFilters(selectedAppointment.clinicId, from, to, {
        professionalId: ALLOW_PROFESSIONAL_CHANGE ? undefined : selectedAppointment.professionalId || undefined,
      });
      setSlots(data.slots.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    } catch (e: any) {
      setError(e.message || "No se pudo cargar disponibilidad");
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    loadData().catch((e: Error) => setError(e.message));
  }, [token]);

  useEffect(() => {
    loadAvailability();
    setSelectedSlot("");
  }, [selectedAppointmentId, selectedAppointment?.clinicId, selectedAppointment?.professionalId]);

  useEffect(() => {
    if (!selectedDay) {
      const firstAvailableDay = [...availableDays].sort()[0];
      if (!firstAvailableDay) return;
      const parsed = fromDateKey(firstAvailableDay);
      setSelectedDay(parsed);
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [availableDays, selectedDay]);

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const onReschedule = async () => {
    if (!token || !selectedAppointment || !selectedSlotData) return;
    if (selectedSlotData.startAt === selectedAppointment.startAt) return setWarning("Este ya es tu turno actual");

    setError("");
    setMsg("");
    setWarning("");
    setIsSubmitting(true);
    try {
      const result = await rescheduleMyAppointment(token, selectedAppointment._id, {
        startAt: selectedSlotData.startAt,
        professionalId: selectedSlotData.professionalId || selectedAppointment.professionalId || undefined,
        specialtyId: selectedSlotData.specialtyId || selectedAppointment.specialtyId || undefined,
      });
      setMsg("Turno reprogramado correctamente. Tu turno anterior fue liberado automáticamente. Te vamos a enviar recordatorios por email antes del turno.");
      setSelectedSlot("");
      await loadData();
      await loadAvailability();
      window.dispatchEvent(new CustomEvent("appointments:refresh"));
      window.history.replaceState({}, "", "/patient/reschedule");
    } catch (e: any) {
      if (e?.status === 409) {
        setError("Ese turno ya no está disponible. Actualizando horarios…");
        await loadAvailability();
      } else {
        setError(e.message || "No se pudo reprogramar");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSlotTimeText = selectedSlot ? new Date(selectedSlot).toLocaleString("es-AR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const currentDateText = selectedAppointment ? new Date(selectedAppointment.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }) : "-";
  const shouldShowSelector = !preselectedAppointmentId;

  return (
    <>
      {user && <Navbar user={user} onLogout={onLogout} />}
      <div className="page public-booking-page" style={{ paddingBottom: isMobile ? 120 : 24 }}>
        <Card>
          <h2>Reprogramar turno</h2>
          <p>Mantené tu turno actual hasta confirmar el nuevo horario.</p>
        </Card>

        {shouldShowSelector && (
          <Card>
            <h3>Paso 1: elegí un turno</h3>
            {!upcomingAppointments.length && <p>No hay turnos para reprogramar.</p>}
            <div className="slot-list">
              {upcomingAppointments.map((appointment) => (
                <button key={appointment._id} className={`slot ${selectedAppointmentId === appointment._id ? "active" : ""}`} onClick={() => setSelectedAppointmentId(appointment._id)}>
                  {clinicById.get(appointment.clinicId)?.name ?? "Clínica"} · {new Date(appointment.startAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                </button>
              ))}
            </div>
          </Card>
        )}

        {selectedAppointment && (
          <>
            <Card className="current-appointment-card">
              <h3>Turno actual</h3>
              <p><b>{clinicById.get(selectedAppointment.clinicId)?.name ?? "Clínica"}</b></p>
              <p>Profesional: {selectedAppointment.professionalName || "Profesional a confirmar"}</p>
              <p>Especialidad: {selectedAppointment.specialtyId || "No informada"}</p>
              <p>Fecha: {currentDateText}</p>
              <p><span className="booking-status-badge">{selectedAppointment.status === "canceled" ? "Cancelado" : "Reservado"}</span></p>
              <div className="booking-summary-actions">
                <a className="btn btn-outline" href="/patient/appointments">Volver a Mis Turnos</a>
                <a className="btn" href={`/c/${selectedAppointment.clinicSlug || clinicById.get(selectedAppointment.clinicId)?.slug || ""}`}>Ver clínica</a>
              </div>
            </Card>

            <div className="booking-main-grid">
              <Card>
                <BookingCalendar calendarMonth={calendarMonth} today={today} selectedDay={selectedDay} availableDays={availableDays} onChangeMonth={setCalendarMonth} onSelectDay={(day) => { setSelectedDay(day); setSelectedSlot(""); }} />
              </Card>
              <Card>
                <SlotsList selectedDay={selectedDay} selectedSlot={selectedSlot} slots={selectedDaySlots} loading={isLoadingAvailability} onSelectSlot={(slot) => setSelectedSlot(slot.startAt)} emptyText="No hay horarios disponibles para este turno en los próximos días." />
              </Card>
            </div>

            <DesktopSummaryCard
              visible={Boolean(selectedSlotData)}
              title="Confirmar reprogramación"
              dateTimeText={selectedSlotTimeText}
              clinicName={clinicById.get(selectedAppointment.clinicId)?.name ?? "Clínica"}
              professionalName={selectedSlotData?.professionalFullName || selectedAppointment.professionalName || "Profesional a confirmar"}
              ctaText="Confirmar reprogramación"
              loadingText="Reprogramando..."
              secondaryText="Mantener turno actual"
              onSecondary={() => window.location.href = "/patient/appointments"}
              disabled={!selectedSlotData}
              loading={isSubmitting}
              onSubmit={onReschedule}
            />
          </>
        )}

        {warning && <Card><p className="warning"><AlertCircle size={14} /> {warning}</p></Card>}
        {error && <Card><p className="error">{error}</p><Button type="button" onClick={loadAvailability}><RotateCcw size={14} /> Actualizar horarios</Button></Card>}
        {msg && <Card><p className="success">{msg}</p></Card>}
      </div>

      <MobileStickyBar
        visible={Boolean(selectedSlotData)}
        dateTimeText={selectedSlotTimeText}
        clinicName={selectedAppointment ? (clinicById.get(selectedAppointment.clinicId)?.name ?? "Clínica") : "Clínica"}
        professionalName={selectedSlotData?.professionalFullName || selectedAppointment?.professionalName || "A confirmar"}
        ctaText="Confirmar reprogramación"
        secondaryText="Mantener turno"
        onSecondary={() => window.location.href = "/patient/appointments"}
        loading={isSubmitting}
        loadingText="Reprogramando..."
        disabled={!selectedSlotData}
        onSubmit={onReschedule}
      />
    </>
  );
}
