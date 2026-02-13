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

export interface ClinicDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  slug: string;
  phone: string;
  address: string;
  city: string;
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

const clinicSchema = new Schema<ClinicDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
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
