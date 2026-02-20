import { Types } from "mongoose";
import { AppointmentDocument } from "../models/Appointment";
import {
  ClinicNotificationRule,
  ClinicNotificationSettings,
  ClinicNotificationSettingsDocument,
} from "../models/ClinicNotificationSettings";
import { Clinic } from "../models/Clinic";
import { env } from "../config/env";
import { Reminder } from "../models/Reminder";
import { Patient } from "../models/Patient";
import { Professional } from "../models/Professional";

function buildDefaultRules(): ClinicNotificationRule[] {
  return [
    { id: "7d-inapp", enabled: true, offsetValue: 7, offsetUnit: "days", channel: "inApp" },
    { id: "7d-email", enabled: true, offsetValue: 7, offsetUnit: "days", channel: "email" },
    { id: "2d-inapp", enabled: true, offsetValue: 2, offsetUnit: "days", channel: "inApp" },
    { id: "2d-email", enabled: true, offsetValue: 2, offsetUnit: "days", channel: "email" },
    { id: "2h-inapp", enabled: true, offsetValue: 2, offsetUnit: "hours", channel: "inApp" },
    { id: "2h-email", enabled: true, offsetValue: 2, offsetUnit: "hours", channel: "email" },
  ];
}

export async function getOrCreateClinicNotificationSettings(clinicId: string | Types.ObjectId) {
  const normalizedClinicId = new Types.ObjectId(clinicId);
  let settings = await ClinicNotificationSettings.findOne({ clinicId: normalizedClinicId });
  if (settings) return settings;

  settings = await ClinicNotificationSettings.create({
    clinicId: normalizedClinicId,
    timezone: "America/Argentina/Buenos_Aires",
    remindersEnabled: true,
    rules: buildDefaultRules(),
  });

  return settings;
}

function computeScheduledDate(startAt: Date, offsetValue: number, unit: ClinicNotificationRule["offsetUnit"]) {
  const date = new Date(startAt);

  switch (unit) {
    case "days":
      date.setDate(date.getDate() - offsetValue);
      break;
    case "hours":
      date.setHours(date.getHours() - offsetValue);
      break;
    case "minutes":
      date.setMinutes(date.getMinutes() - offsetValue);
      break;
    case "seconds":
      date.setSeconds(date.getSeconds() - offsetValue);
      break;
  }

  return date;
}

function getEffectiveOffset(rule: ClinicNotificationRule) {
  if (!env.reminderTestMode) {
    return { value: rule.offsetValue, unit: rule.offsetUnit };
  }

  if (rule.offsetUnit === "days") {
    return { value: rule.offsetValue * 10, unit: "seconds" as const };
  }

  if (rule.offsetUnit === "hours") {
    return { value: rule.offsetValue * 5, unit: "seconds" as const };
  }

  return { value: rule.offsetValue, unit: rule.offsetUnit };
}

function computeScheduledFor(startAt: Date, rule: ClinicNotificationRule) {
  const effective = getEffectiveOffset(rule);
  return computeScheduledDate(startAt, effective.value, effective.unit);
}

async function buildPayloadSnapshot(appointment: AppointmentDocument) {
  const [clinic, professional, patient] = await Promise.all([
    Clinic.findById(appointment.clinicId).select("name address city phone").lean(),
    appointment.professionalId
      ? Professional.findById(appointment.professionalId).select("firstName lastName displayName").lean()
      : Promise.resolve(null),
    appointment.patientId ? Patient.findById(appointment.patientId).select("email").lean() : Promise.resolve(null),
  ]);

  const fullName = professional ? `${professional.firstName ?? ""} ${professional.lastName ?? ""}`.trim() : "";

  return {
    clinicName: clinic?.name ?? "Clínica",
    patientName: appointment.patientFullName,
    startAt: appointment.startAt,
    ...(patient?.email ? { patientEmail: patient.email } : {}),
    ...(professional?.displayName || fullName ? { professionalName: professional?.displayName || fullName } : {}),
    ...(clinic?.address ? { address: clinic.address } : {}),
    ...(clinic?.city ? { city: clinic.city } : {}),
    ...(clinic?.phone ? { phone: clinic.phone } : {}),
  };
}

export async function scheduleAppointmentReminders(appointment: AppointmentDocument) {
  const settings = await getOrCreateClinicNotificationSettings(appointment.clinicId);
  if (!settings.remindersEnabled) return;

  const snapshot = await buildPayloadSnapshot(appointment);
  const now = Date.now();
  for (const rule of settings.rules) {
    if (!rule.enabled) continue;
    const scheduledFor = computeScheduledFor(appointment.startAt, rule);
    if (scheduledFor.getTime() <= now) continue;

    try {
      await Reminder.create({
        clinicId: appointment.clinicId,
        ...(appointment.patientId ? { patientId: appointment.patientId } : {}),
        appointmentId: appointment._id,
        ruleId: rule.id,
        channel: rule.channel,
        scheduledFor,
        status: "scheduled",
        payloadSnapshot: snapshot,
      });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
  }
}

export async function cancelScheduledAppointmentReminders(appointmentId: string | Types.ObjectId) {
  await Reminder.updateMany({ appointmentId, status: { $in: ["scheduled", "failed"] } }, { status: "canceled" });
}

export async function previewReminderSchedule(appointment: AppointmentDocument, settings: ClinicNotificationSettingsDocument) {
  const now = Date.now();
  return settings.rules.map((rule) => {
    const scheduledFor = computeScheduledFor(appointment.startAt, rule);
    return {
      ruleId: rule.id,
      channel: rule.channel,
      enabled: rule.enabled,
      offsetValue: rule.offsetValue,
      offsetUnit: rule.offsetUnit,
      scheduledFor,
      skipped: !rule.enabled || scheduledFor.getTime() <= now,
      label: `${rule.offsetValue} ${rule.offsetUnit} antes por ${rule.channel}`,
    };
  });
}
