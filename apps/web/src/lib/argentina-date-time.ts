export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const ARGENTINA_UTC_OFFSET = '-03:00';
const ISO_WITH_EXPLICIT_ZONE_REGEX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export const parseAppointmentInstant = (value: string): Date => {
  const normalized = value.trim();
  return new Date(ISO_WITH_EXPLICIT_ZONE_REGEX.test(normalized) ? normalized : `${normalized}${ARGENTINA_UTC_OFFSET}`);
};

export const toAppointmentInstantIso = (value: string): string => parseAppointmentInstant(value).toISOString();

export const formatArgentinaDate = (value: string | Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(typeof value === 'string' ? parseAppointmentInstant(value) : value);

export const formatArgentinaTime = (value: string | Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(typeof value === 'string' ? parseAppointmentInstant(value) : value);

export const formatArgentinaDateTime = (value: string | Date): string =>
  `${formatArgentinaDate(value)} ${formatArgentinaTime(value)}`;

export const formatArgentinaTimeRange = (startAt: string | Date, endAt: string | Date): string =>
  `${formatArgentinaTime(startAt)} a ${formatArgentinaTime(endAt)}`;

export const getArgentinaDateKey = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(typeof value === 'string' ? parseAppointmentInstant(value) : value);

export const getTodayArgentinaDateKey = (): string => getArgentinaDateKey(new Date());

export const addDaysToDateKey = (dateKey: string, days: number): string => {
  const cursor = new Date(`${dateKey}T12:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
};

export const getArgentinaWeekDateKeys = (anchor: Date): string[] => {
  const anchorKey = getArgentinaDateKey(anchor);
  const anchorNoon = new Date(`${anchorKey}T12:00:00.000Z`);
  const day = anchorNoon.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDaysToDateKey(anchorKey, diff);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(monday, index));
};

export const getArgentinaDateRangeIso = (fromDateKey: string, toDateKey: string): { from: string; to: string } => ({
  from: new Date(`${fromDateKey}T00:00:00${ARGENTINA_UTC_OFFSET}`).toISOString(),
  to: new Date(`${toDateKey}T23:59:59.999${ARGENTINA_UTC_OFFSET}`).toISOString()
});
