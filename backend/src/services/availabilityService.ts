import { Types } from "mongoose";
import { Appointment } from "../models/Appointment";
import { WeeklyScheduleDay } from "../models/Clinic";
import { Professional } from "../models/Professional";
import { ProfessionalAvailability } from "../models/ProfessionalAvailability";
import { ProfessionalTimeOff } from "../models/ProfessionalTimeOff";

type Slot = { startAt: Date; endAt: Date; professionalId?: string };
type IntervalLike = { start: string; end: string };

type ProfessionalSlotConfig = {
  professionalId: string;
  weeklyBlocks: { weekday: number; startTime: string; endTime: string; slotMinutes: number }[];
};

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

function hasOverlap(timeOff: { startTime?: string; endTime?: string }, startMin: number, endMin: number) {
  if (!timeOff.startTime || !timeOff.endTime) return true;
  const offStart = minutesFromTime(timeOff.startTime);
  const offEnd = minutesFromTime(timeOff.endTime);
  return startMin < offEnd && endMin > offStart;
}

export async function buildAvailableSlots(params: {
  clinicId: Types.ObjectId;
  from: Date;
  to: Date;
  weeklySchedule: WeeklyScheduleDay[];
  slotDurationMinutes: number;
  professionalId?: string;
  specialtyId?: string;
}) {
  const { clinicId, from, to, weeklySchedule, slotDurationMinutes, professionalId, specialtyId } = params;

  const professionalFilter: any = { clinicId, isActive: true };
  if (professionalId) professionalFilter._id = professionalId;
  if (specialtyId) professionalFilter.specialtyIds = specialtyId;

  const professionals = await Professional.find(professionalFilter).select({ _id: 1 }).lean();

  let professionalConfigs: ProfessionalSlotConfig[] = [];

  if (professionals.length > 0) {
    const professionalIds = professionals.map((p) => p._id);
    const blocks = await ProfessionalAvailability.find({
      clinicId,
      professionalId: { $in: professionalIds },
      isActive: true,
    })
      .select({ professionalId: 1, weekday: 1, startTime: 1, endTime: 1, slotMinutes: 1 })
      .lean();

    const grouped = new Map<string, ProfessionalSlotConfig>();
    for (const p of professionals) {
      grouped.set(String(p._id), { professionalId: String(p._id), weeklyBlocks: [] });
    }

    for (const b of blocks) {
      const key = String(b.professionalId);
      const current = grouped.get(key);
      if (!current) continue;
      current.weeklyBlocks.push({
        weekday: b.weekday,
        startTime: b.startTime,
        endTime: b.endTime,
        slotMinutes: b.slotMinutes,
      });
    }

    professionalConfigs = [...grouped.values()].filter((cfg) => cfg.weeklyBlocks.length > 0);
  }

  const bookedQuery: any = {
    clinicId,
    status: "confirmed",
    startAt: { $gte: from, $lt: to },
  };
  if (professionalId) bookedQuery.professionalId = professionalId;

  const booked = await Appointment.find(bookedQuery).select({ startAt: 1, professionalId: 1 }).lean();

  const bookedSet = new Set(
    booked.map((b) => `${new Date(b.startAt).toISOString()}::${b.professionalId ? String(b.professionalId) : ""}`)
  );

  const timeOffFilter: any = { clinicId };
  if (professionalId) {
    timeOffFilter.professionalId = professionalId;
  } else if (professionals.length > 0) {
    timeOffFilter.professionalId = { $in: professionals.map((p) => p._id) };
  }

  const timeOffRows = await ProfessionalTimeOff.find(timeOffFilter)
    .select({ professionalId: 1, date: 1, startTime: 1, endTime: 1 })
    .lean();

  const timeOffByKey = new Map<string, { startTime?: string; endTime?: string }[]>();
  for (const row of timeOffRows) {
    const key = `${String(row.professionalId)}::${row.date}`;
    const list = timeOffByKey.get(key) ?? [];
    const off: { startTime?: string; endTime?: string } = {}
    if (row.startTime) off.startTime = row.startTime;
    if (row.endTime) off.endTime = row.endTime;
    list.push(off);
    timeOffByKey.set(key, list);
  }

  const slots: Slot[] = [];

  if (professionalConfigs.length > 0) {
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

    while (cursor < to) {
      for (const cfg of professionalConfigs) {
        const blocks = cfg.weeklyBlocks.filter((b) => b.weekday === cursor.getUTCDay());
        const dateKey = cursor.toISOString().slice(0, 10);
        const offList = timeOffByKey.get(`${cfg.professionalId}::${dateKey}`) ?? [];

        for (const block of blocks) {
          const startMin = minutesFromTime(block.startTime);
          const endMin = minutesFromTime(block.endTime);

          for (let m = startMin; m + block.slotMinutes <= endMin; m += block.slotMinutes) {
            const slotStart = atUtcMinutes(cursor, m);
            const slotEnd = atUtcMinutes(cursor, m + block.slotMinutes);

            if (slotStart < from || slotStart >= to) continue;
            if (offList.some((off) => hasOverlap(off, m, m + block.slotMinutes))) continue;

            const key = `${slotStart.toISOString()}::${cfg.professionalId}`;
            if (bookedSet.has(key)) continue;

            slots.push({ startAt: slotStart, endAt: slotEnd, professionalId: cfg.professionalId });
          }
        }
      }

      cursor = addDays(cursor, 1);
    }

    return slots;
  }

  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  while (cursor < to) {
    const dayCfg = weeklySchedule.find((d) => d.dayOfWeek === cursor.getUTCDay());

    if (dayCfg?.enabled) {
      for (const interval of dayCfg.intervals as IntervalLike[]) {
        const startMin = minutesFromTime(interval.start);
        const endMin = minutesFromTime(interval.end);
        for (let m = startMin; m + slotDurationMinutes <= endMin; m += slotDurationMinutes) {
          const startAt = atUtcMinutes(cursor, m);
          const endAt = atUtcMinutes(cursor, m + slotDurationMinutes);
          const iso = startAt.toISOString();
          if (startAt >= from && startAt < to && !bookedSet.has(`${iso}::`)) {
            slots.push({ startAt, endAt });
          }
        }
      }
    }

    cursor = addDays(cursor, 1);
  }

  return slots;
}
