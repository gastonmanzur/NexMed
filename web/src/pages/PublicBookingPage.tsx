import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, RotateCcw, Search, Zap } from "lucide-react";

import { publicAvailability, publicCreateAppointment } from "../api/appointments";
import { ApiError } from "../api/client";
import { getPublicClinic, listPublicProfessionals, listPublicSpecialties } from "../api/clinic";
import { Button } from "../components/Button";
import { BookingFiltersPrompt } from "../components/BookingFiltersPrompt";
import { Card } from "../components/Card";
import { MobileStickyBookingBar } from "../components/MobileStickyBookingBar";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { RETURN_TO_KEY } from "./JoinClinicPage";
import { Professional, Specialty } from "../types";

type Slot = { startAt: string; endAt: string; professionalId?: string; professionalFullName?: string; specialtyId?: string };
type CalendarDay = { date: Date; inCurrentMonth: boolean };
type PendingBookingAction = { mode: "slot" | "first"; slotStartAt?: string };

const PENDING_BOOKING_KEY = "turnos_pending_booking";
const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const toDateKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);

const buildMapByDay = (items: Slot[]) => items.reduce<Record<string, Slot[]>>((acc, slot) => {
  const key = slot.startAt.slice(0, 10);
  acc[key] = [...(acc[key] ?? []), slot].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return acc;
}, {});

const buildMonthGrid = (month: Date): CalendarDay[] => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offsetMonday = (firstDay.getDay() + 6) % 7;
  const start = addDays(firstDay, -offsetMonday);
  return Array.from({ length: 42 }).map((_, idx) => ({ date: addDays(start, idx), inCurrentMonth: addDays(start, idx).getMonth() === month.getMonth() }));
};

export function PublicBookingPage({ slug }: { slug: string }) {
  const { token, user, clinic, logout } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
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
  useEffect(() => {
    if (selectedProfessionalId && !filteredProfessionals.some((p) => p._id === selectedProfessionalId)) setSelectedProfessionalId("");
  }, [selectedProfessionalId, filteredProfessionals]);
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
  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

  const storePendingAndGoLogin = (action: PendingBookingAction) => {
    localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(action));
    localStorage.setItem(RETURN_TO_KEY, window.location.pathname + window.location.search);
    window.location.href = "/login";
  };

  const reserveSlot = async (slot: Slot) => {
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
      if (result.warnings?.missingPhone) {
        setWarningMsg("⚠️ Completá tu teléfono para recibir recordatorios del turno");
      }
      setMsg("Turno reservado con éxito");
      setSelectedSlot("");
      await loadAvailability();
      setTimeout(() => { window.location.href = "/patient/appointments"; }, 700);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === "PATIENT_PROFILE_INCOMPLETE") {
        setError("Necesitás completar tu perfil para reservar.");
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setError(err.code === "DUPLICATE_SLOT" ? "Ese turno ya fue reservado. Elegí otro." : "No se pudo reservar el turno. Intentá nuevamente.");
        setSelectedSlot("");
        await loadAvailability();
      } else if (err instanceof ApiError && err.status === 400) {
        setError("No se pudo reservar el turno. Intentá nuevamente.");
      } else {
        setError("No se pudo reservar el turno. Intentá nuevamente.");
      }
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
      setPendingBookingAction(action);
      setFilterPromptOpen(true);
      return;
    }

    if (action.mode === "first" || !isMobile) {
      await reserveSlot(target);
    }
  };

  useEffect(() => {
    if (!user || user.type !== "patient") return;
    const raw = localStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_BOOKING_KEY);
    const action = JSON.parse(raw) as PendingBookingAction;
    proceedBookingAction(action);
  }, [user, hasFilter, slots.length]);

  useEffect(() => {
    if (!hasFilter || !pendingBookingAction) return;
    setFilterPromptOpen(false);
    proceedBookingAction(pendingBookingAction);
    setPendingBookingAction(null);
  }, [hasFilter, pendingBookingAction]);

  const onSlotClick = (slot: Slot) => {
    setSelectedSlot(slot.startAt);
    if (!isMobile) {
      proceedBookingAction({ mode: "slot", slotStartAt: slot.startAt });
    }
  };

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
            <h3 className="booking-card-title"><CalendarDays size={18} /> Elegí una fecha</h3>
            <div className="booking-calendar">
              <div className="calendar-header">
                <button type="button" className="calendar-nav-btn" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
                <strong>{monthFormatter.format(calendarMonth)}</strong>
                <button type="button" className="calendar-nav-btn" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
              </div>
              <div className="calendar-grid">
                {weekdayLabels.map((day) => <div key={day} className="calendar-weekday">{day}</div>)}
                {monthGrid.map(({ date, inCurrentMonth }) => {
                  const isPast = date < today;
                  const hasAvailability = availableDays.has(toDateKey(date));
                  const isSelected = selectedDay ? isSameDay(selectedDay, date) : false;
                  return <button key={toDateKey(date)} type="button" className={`calendar-day ${isSelected ? "calendar-day-selected" : ""}`} disabled={isPast || !hasAvailability} data-muted={!inCurrentMonth} onClick={() => { setSelectedDay(date); setSelectedSlot(""); }}><span>{date.getDate()}</span>{hasAvailability && <span className="calendar-day-dot" aria-hidden="true" />}</button>;
                })}
              </div>
            </div>
          </Card>
          <Card>
            <h3 className="booking-card-title"><Clock3 size={18} /> Turnos disponibles — {selectedDay ? selectedDay.toLocaleDateString("es-AR") : "-"}</h3>
            {isLoadingAvailability ? <div className="slot-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="slot slot-skeleton" />)}</div> : selectedDaySlots.length ? <div className="slot-grid">{selectedDaySlots.map((s) => <button type="button" key={`${s.startAt}-${s.professionalId || "na"}`} className={`slot ${selectedSlot === s.startAt ? "active" : ""}`} onClick={() => onSlotClick(s)}>{new Date(s.startAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</button>)}</div> : <p>No hay turnos disponibles para este día.</p>}
          </Card>
        </div>

        {selectedSlotData && (
          <Card className="desktop-confirm-card">
            <h3>Confirmación</h3>
            <p>{`Seleccionaste: ${selectedSlotTimeText}`}</p>
            <p>Profesional: {selectedSlotData.professionalFullName || "Profesional a confirmar"}</p>
            <p>Clínica: {clinicName}</p>
            {clinicInfo && <p>{[clinicInfo.address, clinicInfo.city, clinicInfo.phone].filter(Boolean).join(" · ")}</p>}
            {!user || user.type !== "patient" ? (
              <div>
                <p>Iniciá sesión para reservar en 2 clicks.</p>
                <a className="btn" href="/login">Iniciar sesión</a>
              </div>
            ) : (
              <div>
                <div className="form-row"><input className="input" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                {msg && <p className="success">{msg}</p>}
                <Button type="button" disabled={!selectedSlot || !hasFilter || isSubmitting} onClick={() => reserveSlot(selectedSlotData)}>{isSubmitting ? "Reservando..." : "Reservar turno"}</Button>
              </div>
            )}
          </Card>
        )}

        <BookingFiltersPrompt
          open={filterPromptOpen}
          specialties={specialties}
          professionals={filteredProfessionals}
          onClose={() => setFilterPromptOpen(false)}
          onPickProfessional={(value) => setSelectedProfessionalId(value)}
          onPickSpecialty={(value) => setSelectedSpecialtyId(value)}
        />
      </div>

      {selectedSlotData && (
        <MobileStickyBookingBar
          visible={Boolean(selectedSlotData)}
          dateTimeText={selectedSlotTimeText}
          clinicName={clinicName}
          professionalName={selectedSlotData.professionalFullName || "A confirmar"}
          disabled={!selectedSlot || !hasFilter || !user || user.type !== "patient"}
          loading={isSubmitting}
          onReserve={() => reserveSlot(selectedSlotData)}
        />
      )}
    </>
  );
}
