export type Interval = { start: string; end: string };
export type WeeklyDay = { dayOfWeek: number; enabled: boolean; intervals: Interval[] };

export type ClinicPublicVisibility = {
  phone: boolean;
  whatsapp: boolean;
  website: boolean;
  address: boolean;
  city: boolean;
  province: boolean;
  postalCode: boolean;
  description: boolean;
  businessHoursNote: boolean;
};

export type Clinic = {
  _id?: string;
  id?: string;
  type?: "clinic";
  name: string;
  email: string;
  slug: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  description?: string;
  businessHoursNote?: string;
  publicVisibility?: ClinicPublicVisibility;
  legalName?: string;
  taxId?: string;
  billingEmail?: string;
  fiscalAddress?: string;
  fiscalCity?: string;
  fiscalProvince?: string;
  fiscalPostalCode?: string;
  invoiceNotes?: string;
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
  whatsapp?: string;
  googleSub?: string;
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
  professionalId?: string | null;
  professionalName?: string | null;
  specialtyId?: string;
  startAt: string;
  endAt: string;
  patientFullName: string;
  patientPhone: string;
  note?: string;
  status: "confirmed" | "cancelled";
};

export type Specialty = {
  _id: string;
  clinicId: string;
  name: string;
  normalizedName?: string;
  description?: string;
  isActive: boolean;
};

export type Professional = {
  _id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  specialtyIds: string[];
  specialties?: { _id: string; name: string }[];
  isActive: boolean;
};

export type ProfessionalAvailabilityBlock = {
  _id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
};

export type ProfessionalTimeOff = {
  _id: string;
  professionalId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
};

export type ProfessionalAvailabilityPayload = {
  weeklyBlocks: ProfessionalAvailabilityBlock[];
  slotMinutes?: number;
  timeoff?: ProfessionalTimeOff[];
};

export type ClinicInvite = {
  _id: string;
  token: string;
  active: boolean;
  label?: string;
  createdAt: string;
  updatedAt?: string;
  url?: string;
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
