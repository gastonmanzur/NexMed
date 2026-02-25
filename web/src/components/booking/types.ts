export type BookingSlot = {
  startAt: string;
  endAt: string;
  professionalId?: string;
  professionalFullName?: string;
  specialtyId?: string;
};

export type CalendarDay = { date: Date; inCurrentMonth: boolean };

export const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
export const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const toDateKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
export const fromDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`);
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);

export const buildMapByDay = (items: BookingSlot[]) =>
  items.reduce<Record<string, BookingSlot[]>>((acc, slot) => {
    const key = slot.startAt.slice(0, 10);
    acc[key] = [...(acc[key] ?? []), slot].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return acc;
  }, {});

export const buildMonthGrid = (month: Date): CalendarDay[] => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offsetMonday = (firstDay.getDay() + 6) % 7;
  const start = addDays(firstDay, -offsetMonday);
  return Array.from({ length: 42 }).map((_, idx) => ({
    date: addDays(start, idx),
    inCurrentMonth: addDays(start, idx).getMonth() === month.getMonth(),
  }));
};
