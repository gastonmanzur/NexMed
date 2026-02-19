import { Schema, model, Types } from "mongoose";

export type WeeklyInterval = {
  start: string;
  end: string;
};

export type WeeklyScheduleDay = {
  dayOfWeek: number;
  enabled: boolean;
  intervals: WeeklyInterval[];
};

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

export interface ClinicDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  slug: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  description: string;
  businessHoursNote: string;
  publicVisibility: ClinicPublicVisibility;
  legalName: string;
  taxId: string;
  billingEmail: string;
  fiscalAddress: string;
  fiscalCity: string;
  fiscalProvince: string;
  fiscalPostalCode: string;
  invoiceNotes: string;
  settings: {
    slotDurationMinutes: number;
    weeklySchedule: WeeklyScheduleDay[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const intervalSchema = new Schema<WeeklyInterval>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const weeklyDaySchema = new Schema<WeeklyScheduleDay>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    enabled: { type: Boolean, required: true, default: false },
    intervals: { type: [intervalSchema], default: [] },
  },
  { _id: false }
);

const defaultSchedule: WeeklyScheduleDay[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
  intervals: dayOfWeek >= 1 && dayOfWeek <= 5 ? [{ start: "09:00", end: "17:00" }] : [],
}));

const defaultVisibility: ClinicPublicVisibility = {
  phone: true,
  whatsapp: true,
  website: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  description: true,
  businessHoursNote: true,
};

const clinicSchema = new Schema<ClinicDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    website: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    description: { type: String, default: "" },
    businessHoursNote: { type: String, default: "" },
    publicVisibility: {
      type: {
        phone: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        website: { type: Boolean, default: true },
        address: { type: Boolean, default: true },
        city: { type: Boolean, default: true },
        province: { type: Boolean, default: true },
        postalCode: { type: Boolean, default: true },
        description: { type: Boolean, default: true },
        businessHoursNote: { type: Boolean, default: true },
      },
      default: defaultVisibility,
      _id: false,
    },
    legalName: { type: String, default: "" },
    taxId: { type: String, default: "" },
    billingEmail: { type: String, default: "" },
    fiscalAddress: { type: String, default: "" },
    fiscalCity: { type: String, default: "" },
    fiscalProvince: { type: String, default: "" },
    fiscalPostalCode: { type: String, default: "" },
    invoiceNotes: { type: String, default: "" },
    settings: {
      slotDurationMinutes: { type: Number, default: 30, min: 5, max: 180 },
      weeklySchedule: {
        type: [weeklyDaySchema],
        default: defaultSchedule,
      },
    },
  },
  { timestamps: true }
);

export const Clinic = model<ClinicDocument>("Clinic", clinicSchema);
