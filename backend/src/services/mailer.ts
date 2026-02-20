import { env } from "../config/env";
import { ReminderDocument } from "../models/Reminder";

function hasSmtpConfig() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass);
}

function formatAppointmentDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export async function sendReminderEmail(reminder: ReminderDocument, timezone: string) {
  const snapshot = reminder.payloadSnapshot;
  const formattedDate = formatAppointmentDate(snapshot.startAt, timezone);
  const message = [
    `[reminder-email] Para: ${snapshot.patientEmail ?? "(sin email)"}`,
    `Clínica: ${snapshot.clinicName}`,
    `Paciente: ${snapshot.patientName}`,
    `Fecha: ${formattedDate}`,
    snapshot.professionalName ? `Profesional: ${snapshot.professionalName}` : undefined,
    snapshot.address ? `Dirección: ${snapshot.address}` : undefined,
    snapshot.city ? `Ciudad: ${snapshot.city}` : undefined,
    snapshot.phone ? `Teléfono: ${snapshot.phone}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  if (!hasSmtpConfig()) {
    console.log(`${message}\n[reminder-email] SMTP no configurado, se registró en consola.`);
    return;
  }

  console.log(`${message}\n[reminder-email] SMTP configurado pero envío real no disponible en este entorno.`);
}
