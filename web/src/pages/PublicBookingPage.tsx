import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, RotateCcw, Search } from "lucide-react";

import { publicAvailability, publicCreateAppointment } from "../api/appointments";
import { getPublicClinic, listPublicProfessionals, listPublicSpecialties } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { Professional, Specialty } from "../types";

type Slot = { startAt: string; endAt: string; professionalId?: string };

type CalendarDay = { date: Date; inCurrentMonth: boolean };

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);

const buildMapByDay = (items: Slot[]) => {
  return items.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = slot.startAt.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), slot].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return acc;
  }, {});
};

const buildMonthGrid = (month: Date): CalendarDay[] => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offsetMonday = (firstDay.getDay() + 6) % 7;
  const start = addDays(firstDay, -offsetMonday);

  return Array.from({ length: 42 }).map((_, idx) => {
    const date = addDays(start, idx);
    return { date, inCurrentMonth: date.getMonth() === month.getMonth() };
  });
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
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const from = useMemo(() => toDateKey(today), [today]);
  const to = useMemo(() => toDateKey(addDays(today, 30)), [today]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedSpecialtyId(params.get("specialtyId") || "");
    setSelectedProfessionalId(params.get("professionalId") || "");
  }, []);

  const filteredProfessionals = useMemo(() => {
    if (!selectedSpecialtyId) return professionals;
    return professionals.filter((p) => p.specialtyIds.includes(selectedSpecialtyId));
  }, [professionals, selectedSpecialtyId]);

  useEffect(() => {
    if (selectedProfessionalId && !filteredProfessionals.some((p) => p._id === selectedProfessionalId)) {
      setSelectedProfessionalId("");
    }
  }, [selectedProfessionalId, filteredProfessionals]);

  const groupedSlots = useMemo(() => buildMapByDay(slots), [slots]);
  const availableDays = useMemo(() => new Set(Object.keys(groupedSlots)), [groupedSlots]);
  const selectedDayKey = selectedDay ? toDateKey(selectedDay) : "";
  const selectedDaySlots = useMemo(() => (selectedDayKey ? groupedSlots[selectedDayKey] ?? [] : []), [groupedSlots, selectedDayKey]);

  const loadAvailability = async () => {
    setIsLoadingAvailability(true);
    setError("");

    try {
      const [availability, specRows, profRows, clinicPublic] = await Promise.all([
        publicAvailability(slug, from, to, {
          specialtyId: selectedSpecialtyId || undefined,
          professionalId: selectedProfessionalId || undefined,
        }),
        listPublicSpecialties(slug),
        listPublicProfessionals(slug),
        getPublicClinic(slug),
      ]);

      setClinicName((clinicPublic as any).name || availability.clinic.name);
      setClinicInfo(clinicPublic);
      setSlots(availability.slots);
      setSpecialties(specRows);
      setProfessionals(profRows);
    } catch (e: any) {
      setError(e.message || "No se pudo cargar la disponibilidad");
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, selectedSpecialtyId, selectedProfessionalId]);

  useEffect(() => {
    if (selectedSlot && !slots.some((slot) => slot.startAt === selectedSlot)) {
      setSelectedSlot("");
    }

    if (!selectedDay) {
      const firstAvailableDay = [...availableDays].sort()[0];
      if (firstAvailableDay) {
        const parsed = fromDateKey(firstAvailableDay);
        setSelectedDay(parsed);
        setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
      return;
    }

    const key = toDateKey(selectedDay);
    if (!availableDays.has(key)) {
      setSelectedDay(undefined);
      setSelectedSlot("");
    }
  }, [availableDays, selectedDay, selectedSlot, slots]);

  const selectedSlotTimeText = useMemo(() => {
    if (!selectedSlot) return "";
    return new Date(selectedSlot).toLocaleString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [selectedSlot]);

  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setIsSubmitting(true);

    try {
      await publicCreateAppointment(
        slug,
        {
          startAt: selectedSlot,
          patientFullName: fullName,
          patientPhone: phone,
          note,
          professionalId: selectedProfessionalId || undefined,
          specialtyId: selectedSpecialtyId || undefined,
        },
        token ?? undefined
      );

      setMsg("Turno reservado con éxito");
      setSelectedSlot("");
      await loadAvailability();

      if (user?.type === "patient") {
        setTimeout(() => {
          window.location.href = "/patient/appointments";
        }, 800);
      }
    } catch (err: any) {
      const message = err.message || "No se pudo reservar el turno";
      if (message.toLowerCase().includes("409") || message.toLowerCase().includes("no disponible")) {
        setError("Ese turno ya no está disponible. Elegí otro horario.");
        await loadAvailability();
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar user={user} clinicName={clinic?.name} onLogout={logout} />
      <div className="page public-booking-page">
        <Card>
          <div className="booking-title-row">
            <div>
              <h2>Reservá tu turno — {clinicName}</h2>
              {clinicInfo && (
                <p>
                  {[
                    clinicInfo.description,
                    clinicInfo.phone,
                    clinicInfo.whatsapp,
                    clinicInfo.website,
                    [clinicInfo.address, clinicInfo.city, clinicInfo.province].filter(Boolean).join(", "),
                    clinicInfo.businessHoursNote,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <a href="/" className="booking-back-link">Volver</a>
          </div>
        </Card>

        <Card>
          <div className="grid-2">
            <label className="booking-filter">
              <span><Filter size={14} /> Especialidad</span>
              <select className="input" value={selectedSpecialtyId} onChange={(e) => setSelectedSpecialtyId(e.target.value)}>
                <option value="">Todas las especialidades</option>
                {specialties.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="booking-filter">
              <span><Search size={14} /> Profesional</span>
              <select className="input" value={selectedProfessionalId} onChange={(e) => setSelectedProfessionalId(e.target.value)}>
                <option value="">Cualquier profesional</option>
                {filteredProfessionals.map((p) => (
                  <option key={p._id} value={p._id}>{p.displayName || `${p.firstName} ${p.lastName}`}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {error && (
          <Card>
            <p className="error">{error}</p>
            <Button type="button" onClick={loadAvailability}><RotateCcw size={14} /> Reintentar</Button>
          </Card>
        )}

        <div className="booking-main-grid">
          <Card>
            <h3 className="booking-card-title"><CalendarDays size={18} /> Elegí una fecha</h3>
            <div className="booking-calendar">
              <div className="calendar-header">
                <button type="button" className="calendar-nav-btn" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                  <ChevronLeft size={16} />
                </button>
                <strong>{monthFormatter.format(calendarMonth)}</strong>
                <button type="button" className="calendar-nav-btn" onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="calendar-grid">
                {weekdayLabels.map((day) => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
                {monthGrid.map(({ date, inCurrentMonth }) => {
                  const isPast = date < today;
                  const hasAvailability = availableDays.has(toDateKey(date));
                  const isDisabled = isPast || !hasAvailability;
                  const isSelected = selectedDay ? isSameDay(selectedDay, date) : false;

                  return (
                    <button
                      key={toDateKey(date)}
                      type="button"
                      className={`calendar-day ${isSelected ? "calendar-day-selected" : ""}`}
                      disabled={isDisabled}
                      data-muted={!inCurrentMonth}
                      onClick={() => {
                        setSelectedDay(date);
                        setSelectedSlot("");
                      }}
                    >
                      <span>{date.getDate()}</span>
                      {hasAvailability && <span className="calendar-day-dot" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="booking-card-title"><Clock3 size={18} /> Turnos disponibles — {selectedDay ? selectedDay.toLocaleDateString("es-AR") : "-"}</h3>
            {isLoadingAvailability ? (
              <div className="slot-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="slot slot-skeleton" />
                ))}
              </div>
            ) : selectedDaySlots.length ? (
              <div className="slot-grid">
                {selectedDaySlots.map((s) => (
                  <button
                    type="button"
                    key={`${s.startAt}-${s.professionalId || "na"}`}
                    className={`slot ${selectedSlot === s.startAt ? "active" : ""}`}
                    onClick={() => setSelectedSlot(s.startAt)}
                  >
                    {new Date(s.startAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            ) : (
              <p>No hay turnos disponibles para este día.</p>
            )}
          </Card>
        </div>

        <Card>
          <h3>Confirmar reserva</h3>
          <p>{selectedSlotTimeText ? `Seleccionaste: ${selectedSlotTimeText}` : "Seleccioná un horario para continuar."}</p>
          <form onSubmit={submit}>
            <div className="form-row">
              <Input placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="form-row">
              <Input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="form-row">
              <Input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {msg && <p className="success">{msg}</p>}
            <Button disabled={!selectedSlot || isSubmitting}>{isSubmitting ? "Reservando..." : "Reservar turno"}</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
