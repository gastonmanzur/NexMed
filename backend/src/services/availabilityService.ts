import { Types } from "mongoose";
import { Appointment } from "../models/Appointment";
import { Professional } from "../models/Professional";
import { ProfessionalAvailability } from "../models/ProfessionalAvailability";
import { ProfessionalTimeOff } from "../models/ProfessionalTimeOff";

export const CLINIC_TIMEZONE = "America/Argentina/Buenos_Aires";
const CLINIC_UTC_OFFSET_MINUTES = -180;

export type Slot = { startAt: Date; endAt: Date; professionalId?: string };
type ProfessionalSlotConfig = {
  professionalId: string;
  weeklyBlocks: { weekday: number; startTime: string; endTime: string; slotMinutes: number }[];
};

type TimeOffByKey = Map<string, { startTime?: string; endTime?: string }[]>;

export type SlotAvailabilityCode =
  | "SLOT_NOT_AVAILABLE"
  | "OUTSIDE_BLOCK"
  | "OVERLAP"
  | "INVALID_GRID"
  | "PROFESSIONAL_MISMATCH"
  | "SPECIALTY_MISMATCH";

function minutesFromTime(value: string) {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
}

function dateKeyFromUTCDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDayToDateKey(dateKey: string) {
  const next = new Date(`${dateKey}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return dateKeyFromUTCDate(next);
}

export function clinicDateKeyToUtcStart(dateKey: string) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return new Date(Date.UTC(year, month - 1, day, -CLINIC_UTC_OFFSET_MINUTES / 60, 0, 0, 0));
}

function clinicDateTimeToUtc(dateKey: string, minutes: number) {
  return new Date(clinicDateKeyToUtcStart(dateKey).getTime() + minutes * 60_000);
}

export function getClinicLocalParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayValue = get("weekday");
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdayMap[weekdayValue] ?? date.getUTCDay(),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

async function getProfessionalConfigs(params: {
  clinicId: Types.ObjectId;
  professionalId?: string;
  specialtyId?: string;
}) {
  const { clinicId, professionalId, specialtyId } = params;
  const professionalFilter: any = { clinicId, isActive: true };
  if (professionalId) professionalFilter._id = professionalId;
  if (specialtyId) professionalFilter.specialtyIds = specialtyId;

  const professionals = await Professional.find(professionalFilter).select({ _id: 1 }).lean();
  if (professionals.length === 0) return [] as ProfessionalSlotConfig[];

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

  return [...grouped.values()].filter((cfg) => cfg.weeklyBlocks.length > 0);
}

async function getTimeOffMap(params: {
  clinicId: Types.ObjectId;
  professionalId?: string;
  professionalIds?: Types.ObjectId[];
  fromUtc: Date;
  toUtc: Date;
}) {
  const timeOffFilter: any = { clinicId: params.clinicId, date: { $gte: dateKeyFromUTCDate(params.fromUtc), $lt: dateKeyFromUTCDate(params.toUtc) } };
  if (params.professionalId) {
    timeOffFilter.professionalId = params.professionalId;
  } else if (params.professionalIds && params.professionalIds.length > 0) {
    timeOffFilter.professionalId = { $in: params.professionalIds };
  }

  const rows = await ProfessionalTimeOff.find(timeOffFilter)
    .select({ professionalId: 1, date: 1, startTime: 1, endTime: 1 })
    .lean();

  const timeOffByKey = new Map<string, { startTime?: string; endTime?: string }[]>();
  for (const row of rows) {
    const key = `${String(row.professionalId)}::${row.date}`;
    const list = timeOffByKey.get(key) ?? [];
    const off: { startTime?: string; endTime?: string } = {};
    if (row.startTime) off.startTime = row.startTime;
    if (row.endTime) off.endTime = row.endTime;
    list.push(off);
    timeOffByKey.set(key, list);
  }

  return timeOffByKey;
}

function hasOverlap(timeOff: { startTime?: string; endTime?: string }, startMin: number, endMin: number) {
  if (!timeOff.startTime || !timeOff.endTime) return true;
  const offStart = minutesFromTime(timeOff.startTime);
  const offEnd = minutesFromTime(timeOff.endTime);
  return startMin < offEnd && endMin > offStart;
}

export async function buildSlots(params: {
  clinicId: Types.ObjectId;
  from: string;
  to: string;
  professionalId?: string;
  specialtyId?: string;
}) {
  const { clinicId, from, to, professionalId, specialtyId } = params;
  const fromUtc = clinicDateKeyToUtcStart(from);
  const toUtc = clinicDateKeyToUtcStart(to);

  const professionalConfigs = await getProfessionalConfigs({
    clinicId,
    ...(professionalId ? { professionalId } : {}),
    ...(specialtyId ? { specialtyId } : {}),
  });

  const bookedQuery: any = {
    clinicId,
    status: "confirmed",
    startAt: { $gte: fromUtc, $lt: toUtc },
  };
  if (professionalId) bookedQuery.professionalId = professionalId;

  const booked = await Appointment.find(bookedQuery).select({ startAt: 1, professionalId: 1 }).lean();
  const bookedSet = new Set(
    booked.map((b) => `${new Date(b.startAt).toISOString()}::${b.professionalId ? String(b.professionalId) : ""}`)
  );

  const timeOffByKey = await getTimeOffMap({
    clinicId,
    ...(professionalId ? { professionalId } : {}),
    professionalIds: professionalConfigs.map((cfg) => new Types.ObjectId(cfg.professionalId)),
    fromUtc,
    toUtc,
  });

  return computeProfessionalSlotsByDateKey({ from, to, professionalConfigs, timeOffByKey, bookedSet });
}

export async function buildAvailableSlots(params: {
  clinicId: Types.ObjectId;
  from: Date;
  to: Date;
  professionalId?: string;
  specialtyId?: string;
}) {
  return buildSlots({
    clinicId: params.clinicId,
    from: dateKeyFromUTCDate(params.from),
    to: dateKeyFromUTCDate(params.to),
    ...(params.professionalId ? { professionalId: params.professionalId } : {}),
    ...(params.specialtyId ? { specialtyId: params.specialtyId } : {}),
  });
}

export function computeProfessionalSlotsByDateKey(params: {
  from: string;
  to: string;
  professionalConfigs: ProfessionalSlotConfig[];
  timeOffByKey: TimeOffByKey;
  bookedSet: Set<string>;
}) {
  const { from, to, professionalConfigs, timeOffByKey, bookedSet } = params;
  const slots: Slot[] = [];
  let cursorDateKey = from;

  while (cursorDateKey < to) {
    const weekday = getClinicLocalParts(clinicDateKeyToUtcStart(cursorDateKey)).weekday;

    for (const cfg of professionalConfigs) {
      const blocks = cfg.weeklyBlocks.filter((b) => b.weekday === weekday);
      const offList = timeOffByKey.get(`${cfg.professionalId}::${cursorDateKey}`) ?? [];

      for (const block of blocks) {
        const startMin = minutesFromTime(block.startTime);
        const endMin = minutesFromTime(block.endTime);

        for (let m = startMin; m + block.slotMinutes <= endMin; m += block.slotMinutes) {
          const slotStart = clinicDateTimeToUtc(cursorDateKey, m);
          const slotEnd = clinicDateTimeToUtc(cursorDateKey, m + block.slotMinutes);

          if (offList.some((off) => hasOverlap(off, m, m + block.slotMinutes))) continue;

          const key = `${slotStart.toISOString()}::${cfg.professionalId}`;
          if (bookedSet.has(key)) continue;

          slots.push({ startAt: slotStart, endAt: slotEnd, professionalId: cfg.professionalId });
        }
      }
    }

    cursorDateKey = addDayToDateKey(cursorDateKey);
  }

  return slots;
}

export function computeProfessionalSlots(params: {
  from: Date;
  to: Date;
  professionalConfigs: ProfessionalSlotConfig[];
  timeOffByKey: TimeOffByKey;
  bookedSet: Set<string>;
}) {
  return computeProfessionalSlotsByDateKey({
    from: dateKeyFromUTCDate(params.from),
    to: dateKeyFromUTCDate(params.to),
    professionalConfigs: params.professionalConfigs,
    timeOffByKey: params.timeOffByKey,
    bookedSet: params.bookedSet,
  });
}

export async function isSlotAvailable(params: {
  clinicId: Types.ObjectId;
  professionalId?: string;
  specialtyId?: string;
  startAt: Date;
  endAt: Date;
}) {
  const local = getClinicLocalParts(params.startAt);
  const from = local.dateKey;
  const to = addDayToDateKey(local.dateKey);

  const slots = await buildSlots({
    clinicId: params.clinicId,
    from,
    to,
    ...(params.professionalId ? { professionalId: params.professionalId } : {}),
    ...(params.specialtyId ? { specialtyId: params.specialtyId } : {}),
  });

  const matched = slots.find(
    (slot) =>
      slot.startAt.getTime() === params.startAt.getTime() &&
      slot.endAt.getTime() === params.endAt.getTime() &&
      (!params.professionalId || slot.professionalId === params.professionalId)
  );

  if (matched) return { available: true as const, code: undefined };

  const overlap = await Appointment.exists({
    clinicId: params.clinicId,
    ...(params.professionalId ? { professionalId: params.professionalId } : {}),
    status: { $ne: "cancelled" },
    startAt: { $lt: params.endAt },
    endAt: { $gt: params.startAt },
  });

  if (overlap) return { available: false as const, code: "OVERLAP" as SlotAvailabilityCode };
  return { available: false as const, code: "SLOT_NOT_AVAILABLE" as SlotAvailabilityCode };
}
