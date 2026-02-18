export type Interval = { start: string; end: string };
export type WeeklyDay = { dayOfWeek: number; enabled: boolean; intervals: Interval[] };

export type Clinic = {
  _id?: string;
  id?: string;
  type?: "clinic";
  name: string;
  email: string;
  slug: string;
  phone: string;
  address: string;
  city: string;
  settings: {
    slotDurationMinutes: number;
    weeklySchedule: WeeklyDay[];
  };
};

export type Patient = {
  _id?: string;
  id?: string;
  type?: "patient";
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  phone?: string;
};

export type AuthUser = {
  id: string;
  type: "clinic" | "patient";
  email: string;
  displayName: string;
};

export type AuthProfile = (Clinic & { type: "clinic" }) | (Patient & { type: "patient" });

export type Appointment = {
  _id: string;
  clinicId: string;
  clinicSlug?: string;
  startAt: string;
  endAt: string;
  patientFullName: string;
  patientPhone: string;
  note?: string;
  status: "confirmed" | "cancelled";
};

export type ClinicInvite = {
  _id: string;
  token: string;
  active: boolean;
  label?: string;
  createdAt: string;
};

export type PatientClinic = {
  _id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  city: string;
  source: "invite" | "appointment";
  createdAt: string;
  lastSeenAt: string;
};
