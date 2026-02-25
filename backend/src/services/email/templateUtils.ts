import { AppointmentEmailPayload } from "../../models/EmailJob";

const AR_TZ = "America/Argentina/Buenos_Aires";

export function formatDateTimeAr(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: AR_TZ,
  }).format(new Date(value));
}

export function createAppointmentEmailLayout(params: {
  title: string;
  intro: string;
  payload: AppointmentEmailPayload;
  ctas: { label: string; url: string }[];
}) {
  const { payload, ctas } = params;
  const start = formatDateTimeAr(payload.startAt);

  const detailRows = [
    ["Clínica", payload.clinic.name],
    ["Profesional", payload.professional.fullName],
    ["Especialidad", payload.specialty?.name ?? "A confirmar"],
    ["Fecha y hora", start],
    ["Dirección", [payload.clinic.address, payload.clinic.city].filter(Boolean).join(", ") || "No informada"],
    ["Teléfono", payload.clinic.phone || "No informado"],
  ];

  const table = detailRows
    .map(([k, v]) => `<tr><td style=\"padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280\">${k}</td><td style=\"padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600\">${v}</td></tr>`)
    .join("");

  const ctasHtml = ctas
    .map((cta) => `<a href=\"${cta.url}\" style=\"display:inline-block;padding:10px 14px;margin-right:8px;margin-top:8px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none\">${cta.label}</a>`)
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px">
      <h2 style="margin-top:0">${params.title}</h2>
      <p>${params.intro}</p>
      <table style="width:100%;border-collapse:collapse">${table}</table>
      <div style="margin-top:16px">${ctasHtml}</div>
      <p style="margin-top:24px;color:#6b7280">NexMed</p>
    </div>
  </div>`;

  const textRows = detailRows.map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const textCtas = ctas.map((cta) => `- ${cta.label}: ${cta.url}`).join("\n");
  const text = `${params.title}\n\n${params.intro}\n\n${textRows}\n\nAcciones\n${textCtas}\n\nNexMed`;

  return { html, text };
}

function formatICSDateUTC(value: string | Date) {
  const d = new Date(value);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

export function buildIcsForAppointment(payload: AppointmentEmailPayload) {
  const uid = `${payload.appointmentId}@nexmed`;
  const dtStamp = formatICSDateUTC(new Date());
  const dtStart = formatICSDateUTC(payload.startAt);
  const dtEnd = formatICSDateUTC(payload.endAt);
  const location = [payload.clinic.address, payload.clinic.city].filter(Boolean).join(", ");
  const description = [
    `Profesional: ${payload.professional.fullName}`,
    `Especialidad: ${payload.specialty?.name ?? "A confirmar"}`,
    `Teléfono clínica: ${payload.clinic.phone ?? "No informado"}`,
    `Dirección: ${location || "No informada"}`,
  ].join("\\n");

  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NexMed//Appointments//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Turno médico — ${payload.clinic.name}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return {
    filename: "turno.ics",
    content,
    contentType: "text/calendar; charset=utf-8",
  };
}
