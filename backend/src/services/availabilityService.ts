import { Types } from "mongoose";
import { Appointment } from "../models/Appointment";
import { WeeklyScheduleDay } from "../models/Clinic";

type Slot = { startAt: Date; endAt: Date };

function minutesFromTime(value: string) {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(base.getUTCDate() + days);
  return next;
}

function atUtcMinutes(date: Date, minutes: number) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  d.setUTCMinutes(minutes);
  return d;
}

export async function buildAvailableSlots(params: {
  clinicId: Types.ObjectId;
  from: Date;
  to: Date;
  weeklySchedule: WeeklyScheduleDay[];
  slotDurationMinutes: number;
}) {
  const { clinicId, from, to, weeklySchedule, slotDurationMinutes } = params;

  const booked = await Appointment.find({
    clinicId,
    status: "confirmed",
    startAt: { $gte: from, $lt: to },
  })
    .select({ startAt: 1 })
    .lean();

  const bookedSet = new Set(booked.map((b) => new Date(b.startAt).toISOString()));

  const slots: Slot[] = [];
  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  while (cursor < to) {
    const dayCfg = weeklySchedule.find((d) => d.dayOfWeek === cursor.getUTCDay());

    if (dayCfg?.enabled) {
      for (const interval of dayCfg.intervals) {
        const startMin = minutesFromTime(interval.start);
        const endMin = minutesFromTime(interval.end);
        for (let m = startMin; m + slotDurationMinutes <= endMin; m += slotDurationMinutes) {
          const startAt = atUtcMinutes(cursor, m);
          const endAt = atUtcMinutes(cursor, m + slotDurationMinutes);
          const iso = startAt.toISOString();
          if (startAt >= from && startAt < to && !bookedSet.has(iso)) {
            slots.push({ startAt, endAt });
          }
        }
      }
    }

    cursor = addDays(cursor, 1);
  }

  return slots;
}
