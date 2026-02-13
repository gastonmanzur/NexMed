export type Interval = { start: string; end: string };
export type WeeklyDay = { dayOfWeek: number; enabled: boolean; intervals: Interval[] };

export type Clinic = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  slug: string;
  settings: {
    slotDurationMinutes: number;
    weeklySchedule: WeeklyDay[];
  };
};

export type Appointment = {
  _id: string;
  clinicId: string;
  startAt: string;
  endAt: string;
  patientFullName: string;
  patientPhone: string;
  note?: string;
  status: "confirmed" | "cancelled";
};
