import { Types } from "mongoose";
import { env } from "../../config/env";
import { Appointment } from "../../models/Appointment";
import { Clinic, ClinicReminderPolicy, ReminderPolicyOffset } from "../../models/Clinic";
import { ReminderJob } from "../../models/ReminderJob";

const DEFAULT_POLICY: ClinicReminderPolicy = {
  enabled: true,
  channels: { email: true },
  offsets: [
    { amount: 7, unit: "days" },
    { amount: 2, unit: "days" },
    { amount: 2, unit: "hours" },
  ],
  updatedAt: new Date(),
};

export function getDefaultReminderPolicy() {
  return {
    ...DEFAULT_POLICY,
    channels: { ...DEFAULT_POLICY.channels },
    offsets: DEFAULT_POLICY.offsets.map((offset) => ({ ...offset })),
    updatedAt: new Date(),
  };
}

export function computeScheduledFor(
  appointmentStartAt: Date,
  offset: ReminderPolicyOffset,
  _clinicTimezone: string,
  testMode = env.reminderTestMode
) {
  const scheduledFor = new Date(appointmentStartAt);

  if (!testMode) {
    if (offset.unit === "days") {
      scheduledFor.setDate(scheduledFor.getDate() - offset.amount);
    } else {
      scheduledFor.setHours(scheduledFor.getHours() - offset.amount);
    }

    return scheduledFor;
  }

  if (offset.unit === "days") {
    if (env.reminderTestDayUnit === "seconds") {
      scheduledFor.setSeconds(scheduledFor.getSeconds() - offset.amount);
    } else {
      scheduledFor.setMinutes(scheduledFor.getMinutes() - offset.amount);
    }
    return scheduledFor;
  }

  const hourAmount = Math.max(1, offset.amount * Math.max(1, env.reminderTestHourMultiplier));
  if (env.reminderTestHourUnit === "minutes") {
    scheduledFor.setMinutes(scheduledFor.getMinutes() - hourAmount);
  } else {
    scheduledFor.setSeconds(scheduledFor.getSeconds() - hourAmount);
  }

  return scheduledFor;
}

export async function enqueueRemindersForAppointment(appointmentId: string | Types.ObjectId) {
  const appointment = await Appointment.findById(appointmentId).select("_id clinicId patientId startAt status").lean();
  if (!appointment || appointment.status !== "booked") return;

  const clinic = await Clinic.findById(appointment.clinicId).select("reminderPolicy").lean();
  const policy = clinic?.reminderPolicy ?? getDefaultReminderPolicy();
  if (!policy.enabled || !policy.channels.email) return;

  const now = new Date();
  for (const offset of policy.offsets) {
    const dedupeKey = `reminder:${appointment._id}:email:${offset.amount}${offset.unit}`;
    const scheduledFor = computeScheduledFor(appointment.startAt, offset, env.timezone, env.reminderTestMode);
    if (scheduledFor.getTime() < now.getTime()) continue;

    await ReminderJob.updateOne(
      { dedupeKey },
      {
        $set: {
          appointmentId: appointment._id,
          clinicId: appointment.clinicId,
          patientId: appointment.patientId,
          channel: "email",
          offsetAmount: offset.amount,
          offsetUnit: offset.unit,
          scheduledFor,
          status: "pending",
          attempts: 0,
          lastError: "",
          nextRunAt: scheduledFor,
        },
        $setOnInsert: { dedupeKey },
      },
      { upsert: true }
    );
  }
}

export async function cancelPendingReminders(appointmentId: string | Types.ObjectId, reason: string) {
  const now = new Date();
  await ReminderJob.updateMany(
    {
      appointmentId,
      status: { $in: ["pending", "failed"] },
      nextRunAt: { $gte: now },
    },
    {
      $set: {
        status: "canceled",
        lastError: `canceled:${reason}`,
      },
    }
  );
}

export async function rescheduleReminders(oldAppointmentId: string | Types.ObjectId, newAppointmentId: string | Types.ObjectId) {
  await cancelPendingReminders(oldAppointmentId, "rescheduled");
  await enqueueRemindersForAppointment(newAppointmentId);
}
