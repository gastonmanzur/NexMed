const DEFAULT_CLINIC_TIMEZONE = "America/Argentina/Buenos_Aires";

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getZonedFormatter(timeZone: string) {
  const cacheKey = `${timeZone}::zoned`;
  const cached = zonedFormatterCache.get(cacheKey);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  zonedFormatterCache.set(cacheKey, formatter);
  return formatter;
}

function getOffsetFormatter(timeZone: string) {
  const cacheKey = `${timeZone}::offset`;
  const cached = offsetFormatterCache.get(cacheKey);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "shortOffset",
    hourCycle: "h23",
  });

  offsetFormatterCache.set(cacheKey, formatter);
  return formatter;
}

function asDate(value: Date | string) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = getZonedFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  const weekday = weekdayMap[lookup.weekday ?? ""];
  if (weekday === undefined) {
    throw new Error(`Cannot map weekday for timezone ${timeZone}`);
  }

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    weekday,
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = getOffsetFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const zoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "";

  if (zoneName === "GMT" || zoneName === "UTC") {
    return 0;
  }

  const match = zoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset format: ${zoneName}`);
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

export function parseLocalDateTime(dateStr: string, timeStr: string, timeZone = DEFAULT_CLINIC_TIMEZONE) {
  const [yearRaw, monthRaw, dayRaw] = dateStr.split("-");
  const [hourRaw, minuteRaw] = timeStr.split(":");

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

export function getWeekdayInClinicTz(dateOrIso: Date | string, timeZone = DEFAULT_CLINIC_TIMEZONE) {
  return getZonedParts(asDate(dateOrIso), timeZone).weekday;
}

export function formatDateKeyInClinicTz(dateOrIso: Date | string, timeZone = DEFAULT_CLINIC_TIMEZONE) {
  const { year, month, day } = getZonedParts(asDate(dateOrIso), timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export { DEFAULT_CLINIC_TIMEZONE };
