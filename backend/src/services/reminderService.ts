import { AppointmentDocument } from "../models/Appointment";
import { enqueueRemindersForAppointment, cancelPendingReminders, computeScheduledFor } from "./reminders/reminderService";
import { ClinicReminderPolicy } from "../models/Clinic";

export async function scheduleAppointmentReminders(appointment: AppointmentDocument) {
  await enqueueRemindersForAppointment(appointment._id);
}

export async function cancelScheduledAppointmentReminders(appointmentId: string) {
  await cancelPendingReminders(appointmentId, "appointment_updated");
}

export async function previewReminderSchedule(appointment: AppointmentDocument, settings: { reminderPolicy?: ClinicReminderPolicy }) {
  const offsets = settings.reminderPolicy?.offsets ?? [
    { amount: 7, unit: "days" as const },
    { amount: 2, unit: "days" as const },
    { amount: 2, unit: "hours" as const },
  ];
  const now = Date.now();

  return offsets.map((offset) => {
    const scheduledFor = computeScheduledFor(appointment.startAt, offset, "America/Argentina/Buenos_Aires");
    return {
      ruleId: `${offset.amount}${offset.unit}`,
      channel: "email" as const,
      enabled: true,
      offsetValue: offset.amount,
      offsetUnit: offset.unit,
      scheduledFor,
      skipped: scheduledFor.getTime() <= now,
      label: `${offset.amount} ${offset.unit} antes por email`,
    };
  });
}
