import { Clock3 } from "lucide-react";

import { BookingSlot } from "./types";

type Props = {
  selectedDay?: Date;
  selectedSlot: string;
  slots: BookingSlot[];
  loading: boolean;
  onSelectSlot: (slot: BookingSlot) => void;
  emptyText?: string;
};

export function SlotsList({ selectedDay, selectedSlot, slots, loading, onSelectSlot, emptyText = "No hay turnos disponibles para este día." }: Props) {
  return (
    <>
      <h3 className="booking-card-title"><Clock3 size={18} /> Turnos disponibles — {selectedDay ? selectedDay.toLocaleDateString("es-AR") : "-"}</h3>
      {loading ? (
        <div className="slot-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="slot slot-skeleton" />)}</div>
      ) : slots.length ? (
        <div className="slot-grid">
          {slots.map((slot) => (
            <button
              type="button"
              key={`${slot.startAt}-${slot.professionalId || "na"}`}
              className={`slot ${selectedSlot === slot.startAt ? "active" : ""}`}
              onClick={() => onSelectSlot(slot)}
            >
              {new Date(slot.startAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
        </div>
      ) : <p>{emptyText}</p>}
    </>
  );
}
