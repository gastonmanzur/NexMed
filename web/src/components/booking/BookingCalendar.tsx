import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { buildMonthGrid, isSameDay, monthFormatter, toDateKey, weekdayLabels } from "./types";

type Props = {
  calendarMonth: Date;
  today: Date;
  selectedDay?: Date;
  availableDays: Set<string>;
  onChangeMonth: (nextMonth: Date) => void;
  onSelectDay: (day: Date) => void;
};

export function BookingCalendar({ calendarMonth, today, selectedDay, availableDays, onChangeMonth, onSelectDay }: Props) {
  const monthGrid = buildMonthGrid(calendarMonth);

  return (
    <>
      <h3 className="booking-card-title"><CalendarDays size={18} /> Elegí una fecha</h3>
      <div className="booking-calendar">
        <div className="calendar-header">
          <button type="button" className="calendar-nav-btn" onClick={() => onChangeMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
          <strong>{monthFormatter.format(calendarMonth)}</strong>
          <button type="button" className="calendar-nav-btn" onClick={() => onChangeMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="calendar-grid">
          {weekdayLabels.map((day) => <div key={day} className="calendar-weekday">{day}</div>)}
          {monthGrid.map(({ date, inCurrentMonth }) => {
            const isPast = date < today;
            const hasAvailability = availableDays.has(toDateKey(date));
            const isSelected = selectedDay ? isSameDay(selectedDay, date) : false;
            return (
              <button
                key={toDateKey(date)}
                type="button"
                className={`calendar-day ${isSelected ? "calendar-day-selected" : ""}`}
                disabled={isPast || !hasAvailability}
                data-muted={!inCurrentMonth}
                onClick={() => onSelectDay(date)}
              >
                <span>{date.getDate()}</span>
                {hasAvailability && <span className="calendar-day-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
