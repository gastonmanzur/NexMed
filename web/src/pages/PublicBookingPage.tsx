import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Filter, RotateCcw, Search, Zap } from "lucide-react";

import { publicAvailability, publicCreateAppointment } from "../api/appointments";
import { ApiError } from "../api/client";
import { getPublicClinic, listPublicProfessionals, listPublicSpecialties } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Navbar } from "../components/Navbar";
import { BookingCalendar } from "../components/booking/BookingCalendar";
import { DesktopSummaryCard } from "../components/booking/DesktopSummaryCard";
import { FiltersPrompt } from "../components/booking/FiltersPrompt";
import { MobileStickyBar } from "../components/booking/MobileStickyBar";
import { SlotsList } from "../components/booking/SlotsList";
import { addDays, BookingSlot, buildMapByDay, fromDateKey, toDateKey } from "../components/booking/types";
import { useAuth } from "../hooks/useAuth";
import { RETURN_TO_KEY } from "./JoinClinicPage";
import { Professional, Specialty } from "../types";

type PendingBookingAction = { mode: "slot" | "first"; slotStartAt?: string };
const PENDING_BOOKING_KEY = "turnos_pending_booking";

export function PublicBookingPage({ slug }: { slug: string }) {
  const { token, user, clinic, logout } = useAuth();
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [clinicName, setClinicName] = useState("Clínica");
  const [clinicInfo, setClinicInfo] = useState<any>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedDay, setSelectedDay] = useState<Date>();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [error, setError] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilterValidation, setShowFilterValidation] = useState(false);
  const [filterPromptOpen, setFilterPromptOpen] = useState(false);
  const [pendingBookingAction, setPendingBookingAction] = useState<PendingBookingAction | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);

  const today = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), []);
  const from = useMemo(() => toDateKey(today), [today]);
  const to = useMemo(() => toDateKey(addDays(today, 30)), [today]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedSpecialtyId(params.get("specialtyId") || "");
    setSelectedProfessionalId(params.get("professionalId") || "");
  }, []);

  const filteredProfessionals = useMemo(() => !selectedSpecialtyId ? professionals : professionals.filter((p) => p.specialtyIds.includes(selectedSpecialtyId)), [professionals, selectedSpecialtyId]);
  useEffect(() => { if (selectedProfessionalId && !filteredProfessionals.some((p) => p._id === selectedProfessionalId)) setSelectedProfessionalId(""); }, [selectedProfessionalId, filteredProfessionals]);
  useEffect(() => { if (professionals.length === 1 && !selectedProfessionalId) setSelectedProfessionalId(professionals[0]._id); }, [professionals, selectedProfessionalId]);
  useEffect(() => { if (specialties.length === 1 && !selectedSpecialtyId) setSelectedSpecialtyId(specialties[0]._id); }, [specialties, selectedSpecialtyId]);

  const groupedSlots = useMemo(() => buildMapByDay(slots), [slots]);
  const availableDays = useMemo(() => new Set(Object.keys(groupedSlots)), [groupedSlots]);
  const selectedDayKey = selectedDay ? toDateKey(selectedDay) : "";
  const selectedDaySlots = useMemo(() => (selectedDayKey ? groupedSlots[selectedDayKey] ?? [] : []), [groupedSlots, selectedDayKey]);
  const selectedSlotData = useMemo(() => slots.find((slot) => slot.startAt === selectedSlot), [slots, selectedSlot]);

  const loadAvailability = async () => {
    setError("");
    setIsLoadingAvailability(true);
    try {
      const [specRows, profRows, clinicPublic] = await Promise.all([listPublicSpecialties(slug), listPublicProfessionals(slug), getPublicClinic(slug)]);
      setSpecialties(specRows);
      setProfessionals(profRows);
      setClinicName((clinicPublic as any).name || "Clínica");
      setClinicInfo(clinicPublic);
      const availability = await publicAvailability(slug, from, to, { specialtyId: selectedSpecialtyId || undefined, professionalId: selectedProfessionalId || undefined });
      setSlots(availability.slots.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    } catch (e: any) {
      setError(e.message || "No se pudo cargar la disponibilidad");
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => { loadAvailability(); }, [slug, selectedSpecialtyId, selectedProfessionalId]);

  useEffect(() => {
    if (!selectedDay) {
      const firstAvailableDay = [...availableDays].sort()[0];
      if (firstAvailableDay) {
        const parsed = fromDateKey(firstAvailableDay);
        setSelectedDay(parsed);
        setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  }, [availableDays, selectedDay]);

  const hasFilter = Boolean(selectedProfessionalId) || Boolean(selectedSpecialtyId);
  const selectedSlotTimeText = selectedSlot ? new Date(selectedSlot).toLocaleString("es-AR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }) : "";

  const storePendingAndGoLogin = (action: PendingBookingAction) => {
    localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(action));
    localStorage.setItem(RETURN_TO_KEY, window.location.pathname + window.location.search);
    window.location.href = "/login";
  };

  const reserveSlot = async (slot: BookingSlot) => {
    if (!user || user.type !== "patient") return storePendingAndGoLogin({ mode: "slot", slotStartAt: slot.startAt });
    setIsSubmitting(true);
    setError("");
    setMsg("");
    setWarningMsg("");
    try {
      const result = await publicCreateAppointment(slug, {
        startAt: slot.startAt,
        note: note || undefined,
        professionalId: slot.professionalId || selectedProfessionalId || undefined,
        specialtyId: selectedSpecialtyId || undefined,
      }, token ?? undefined);
      if (result.warnings?.missingPhone) setWarningMsg("⚠️ Completá tu teléfono para recibir recordatorios por WhatsApp/SMS (próximamente).");
      if (result.emailQueued && result.email) setMsg(`Turno reservado con éxito. Se envió un email de confirmación a ${result.email}. Te vamos a enviar recordatorios por email antes del turno.`);
      else setMsg("Turno reservado con éxito. Te vamos a enviar recordatorios por email antes del turno.");
      setSelectedSlot("");
      await loadAvailability();
      setTimeout(() => { window.location.href = "/patient/appointments"; }, 700);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === "PATIENT_PROFILE_INCOMPLETE") return setError("Necesitás completar tu perfil para reservar.");
      if (err instanceof ApiError && err.status === 409) {
        setError(err.code === "DUPLICATE_SLOT" ? "Ese turno ya fue reservado. Elegí otro." : "No se pudo reservar el turno. Intentá nuevamente.");
        setSelectedSlot("");
        await loadAvailability();
      } else setError("No se pudo reservar el turno. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedBookingAction = async (action: PendingBookingAction) => {
    const target = action.mode === "first" ? slots[0] : slots.find((slot) => slot.startAt === action.slotStartAt);
    if (!target) return setError("No hay turnos disponibles para reservar.");
    setSelectedSlot(target.startAt);

    if (!user || user.type !== "patient") return storePendingAndGoLogin(action);
    if (!hasFilter) {
      setShowFilterValidation(true);
      setPendingBookingAction(action);
      setFilterPromptOpen(true);
      return;
    }

    if (action.mode === "first" || !isMobile) await reserveSlot(target);
  };

  useEffect(() => {
    if (!user || user.type !== "patient") return;
    const raw = localStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_BOOKING_KEY);
    proceedBookingAction(JSON.parse(raw) as PendingBookingAction);
  }, [user, hasFilter, slots.length]);

  useEffect(() => {
    if (!hasFilter || !pendingBookingAction) return;
    setFilterPromptOpen(false);
    proceedBookingAction(pendingBookingAction);
    setPendingBookingAction(null);
  }, [hasFilter, pendingBookingAction]);

  return (
    <>
      <Navbar user={user} clinicName={clinic?.name} onLogout={logout} />
      <div className="page public-booking-page" style={{ paddingBottom: isMobile ? 120 : 24 }}>
        <Card>
          <div className="booking-title-row">
            <div>
              <h2>Reservá tu turno — {clinicName}</h2>
              {clinicInfo && <p>{[clinicInfo.description, clinicInfo.phone, clinicInfo.whatsapp, [clinicInfo.address, clinicInfo.city, clinicInfo.province].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>}
            </div>
            <a href="/" className="booking-back-link">Volver</a>
          </div>
        </Card>

        <Card>
          <div className={`grid-2 booking-filters-grid ${showFilterValidation && !hasFilter ? "booking-filters-grid-warning" : ""}`}>
            <label className="booking-filter"><span><Filter size={14} /> Especialidad</span><select className="input" value={selectedSpecialtyId} onChange={(e) => setSelectedSpecialtyId(e.target.value)}><option value="">Todas las especialidades</option>{specialties.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
            <label className="booking-filter"><span><Search size={14} /> Profesional</span><select className="input" value={selectedProfessionalId} onChange={(e) => setSelectedProfessionalId(e.target.value)}><option value="">Cualquier profesional</option>{filteredProfessionals.map((p) => <option key={p._id} value={p._id}>{p.displayName || `${p.firstName} ${p.lastName}`}</option>)}</select></label>
          </div>
          <div className="booking-actions-row">
            <Button type="button" disabled={isSubmitting || isLoadingAvailability || slots.length === 0} onClick={() => proceedBookingAction({ mode: "first" })}><Zap size={14} /> Reservar el primer turno libre</Button>
            <p className={`booking-filter-hint ${showFilterValidation && !hasFilter ? "booking-filter-hint-warning" : ""}`}>{showFilterValidation && !hasFilter && <AlertCircle size={14} />}Seleccioná un profesional o una especialidad para continuar.</p>
          </div>
        </Card>

        {error && <Card><p className="error">{error}</p><Button type="button" onClick={loadAvailability}><RotateCcw size={14} /> Reintentar</Button></Card>}
        {warningMsg && <Card><p className="warning">{warningMsg}</p><a className="btn" href="/patient/profile">Completar perfil</a></Card>}

        <div className="booking-main-grid">
          <Card>
            <BookingCalendar
              calendarMonth={calendarMonth}
              today={today}
              selectedDay={selectedDay}
              availableDays={availableDays}
              onChangeMonth={setCalendarMonth}
              onSelectDay={(date) => { setSelectedDay(date); setSelectedSlot(""); }}
            />
          </Card>
          <Card>
            <SlotsList
              selectedDay={selectedDay}
              selectedSlot={selectedSlot}
              slots={selectedDaySlots}
              loading={isLoadingAvailability}
              onSelectSlot={(slot) => {
                setSelectedSlot(slot.startAt);
                if (!isMobile) proceedBookingAction({ mode: "slot", slotStartAt: slot.startAt });
              }}
            />
          </Card>
        </div>

        <DesktopSummaryCard
          visible={Boolean(selectedSlotData)}
          dateTimeText={selectedSlotTimeText}
          clinicName={clinicName}
          professionalName={selectedSlotData?.professionalFullName || "Profesional a confirmar"}
          details={clinicInfo ? [clinicInfo.address, clinicInfo.city, clinicInfo.phone].filter(Boolean).join(" · ") : undefined}
          ctaText="Reservar turno"
          loadingText="Reservando..."
          disabled={!selectedSlot || !hasFilter || isSubmitting}
          loading={isSubmitting}
          onSubmit={() => selectedSlotData && reserveSlot(selectedSlotData)}
        >
          {!user || user.type !== "patient" ? <div><p>Iniciá sesión para reservar en 2 clicks.</p><a className="btn" href="/login">Iniciar sesión</a></div> : <div className="form-row"><input className="input" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} /></div>}
          {msg && <p className="success">{msg}</p>}
        </DesktopSummaryCard>

        <FiltersPrompt open={filterPromptOpen} specialties={specialties} professionals={filteredProfessionals} onClose={() => setFilterPromptOpen(false)} onPickProfessional={(v) => setSelectedProfessionalId(v)} onPickSpecialty={(v) => setSelectedSpecialtyId(v)} />
      </div>

      <MobileStickyBar
        visible={Boolean(selectedSlotData)}
        dateTimeText={selectedSlotTimeText}
        clinicName={clinicName}
        professionalName={selectedSlotData?.professionalFullName || "A confirmar"}
        ctaText="Reservar"
        disabled={!selectedSlot || !hasFilter || !user || user.type !== "patient"}
        loading={isSubmitting}
        loadingText="Reservando..."
        onSubmit={() => selectedSlotData && reserveSlot(selectedSlotData)}
      />
    </>
  );
}
