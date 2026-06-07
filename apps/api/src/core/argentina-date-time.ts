export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const ARGENTINA_UTC_OFFSET = '-03:00';
const ISO_WITH_EXPLICIT_ZONE_REGEX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const timeFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export const getArgentinaDateKey = (value: Date): string => dateFormatter.format(value);
export const getArgentinaTime = (value: Date): string => timeFormatter.format(value);

export const parseAppointmentInstant = (value: string): Date => {
  const normalized = value.trim();
  const explicitZoneValue = ISO_WITH_EXPLICIT_ZONE_REGEX.test(normalized)
    ? normalized
    : `${normalized}${ARGENTINA_UTC_OFFSET}`;

  const parsed = new Date(explicitZoneValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Number.NaN);
  }

  return parsed;
};

export const argentinaLocalDateTimeToUtcDate = (date: string, time: string): Date => {
  const parsed = new Date(`${date}T${time}:00${ARGENTINA_UTC_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Argentina local date/time: ${date} ${time}`);
  }
  return parsed;
};

export const formatAppointmentDateArgentina = (value: string | Date): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(typeof value === 'string' ? new Date(value) : value);

export const formatAppointmentTimeArgentina = (value: string | Date): string =>
  timeFormatter.format(typeof value === 'string' ? new Date(value) : value);

export const formatAppointmentDateTimeArgentina = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${formatAppointmentDateArgentina(date)} a las ${formatAppointmentTimeArgentina(date)}`;
};

export const getArgentinaDayRange = (date: string): { from: Date; to: Date } => ({
  from: argentinaLocalDateTimeToUtcDate(date, '00:00'),
  to: new Date(`${date}T23:59:59.999${ARGENTINA_UTC_OFFSET}`)
});

