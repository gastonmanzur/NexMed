import { Schema, Types, model } from "mongoose";

export type ReminderOffsetUnit = "days" | "hours";
export type ReminderChannel = "inApp" | "email";

export interface ClinicNotificationRule {
  id: string;
  enabled: boolean;
  offsetValue: number;
  offsetUnit: ReminderOffsetUnit;
  channel: ReminderChannel;
}

export interface ClinicNotificationSettingsDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  timezone: string;
  remindersEnabled: boolean;
  rules: ClinicNotificationRule[];
  createdAt: Date;
  updatedAt: Date;
}

const reminderRuleSchema = new Schema<ClinicNotificationRule>(
  {
    id: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    offsetValue: { type: Number, required: true, min: 1 },
    offsetUnit: { type: String, enum: ["days", "hours"], required: true },
    channel: { type: String, enum: ["inApp", "email"], required: true },
  },
  { _id: false }
);

const clinicNotificationSettingsSchema = new Schema<ClinicNotificationSettingsDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, unique: true, index: true },
    timezone: { type: String, default: "America/Argentina/Buenos_Aires" },
    remindersEnabled: { type: Boolean, default: true },
    rules: { type: [reminderRuleSchema], default: [] },
  },
  { timestamps: true }
);

export const ClinicNotificationSettings = model<ClinicNotificationSettingsDocument>(
  "ClinicNotificationSettings",
  clinicNotificationSettingsSchema
);
