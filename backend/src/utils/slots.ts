const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

type SlotValidationCode = "VALIDATION";

export class SlotValidationError extends Error {
  statusCode = 400;
  code: SlotValidationCode = "VALIDATION";

  constructor(message: string) {
    super(message);
    this.name = "SlotValidationError";
  }
}

function getLocalHourMinute(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { hour, minute };
}

function minutesFromTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new SlotValidationError("Hora de bloque inválida");
  }

  return hour * 60 + minute;
}

export function normalizeStartAt(date: Date) {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
}

export function alignToGrid(startAt: Date, blockStartTime: string, slotMinutes: number, tz = DEFAULT_TIMEZONE) {
  if (!Number.isInteger(slotMinutes) || slotMinutes <= 0) {
    throw new SlotValidationError("slotMinutes inválido");
  }

  const { hour, minute } = getLocalHourMinute(startAt, tz);
  const slotMinute = hour * 60 + minute;
  const blockStartMinute = minutesFromTime(blockStartTime);
  const delta = slotMinute - blockStartMinute;

  if (delta < 0 || delta % slotMinutes !== 0) {
    throw new SlotValidationError("El turno no está alineado a la grilla de disponibilidad");
  }
}

export function buildSlotKey(clinicId: string, professionalId: string, startAtNormalized: Date) {
  return `${clinicId}::${professionalId}::${startAtNormalized.toISOString()}`;
}
