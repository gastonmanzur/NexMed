import { env } from "../config/env";
import { Appointment } from "../models/Appointment";
import { Clinic } from "../models/Clinic";
import { Patient } from "../models/Patient";
import { Professional } from "../models/Professional";
import { ReminderJob } from "../models/ReminderJob";
import { ReminderLog } from "../models/ReminderLog";
import { Specialty } from "../models/Specialty";
import { getEmailProvider } from "../services/email/emailProvider";

const BATCH_SIZE = 25;
let timer: NodeJS.Timeout | null = null;

function getBackoffMs(attempt: number) {
  if (attempt <= 1) return 30_000;
  if (attempt === 2) return 2 * 60_000;
  if (attempt === 3) return 10 * 60_000;
  if (attempt === 4) return 60 * 60_000;
  return 0;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: env.timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function processJob(jobId: string) {
  const now = new Date();
  const locked = await ReminderJob.findOneAndUpdate(
    { _id: jobId, status: "pending", nextRunAt: { $lte: now } },
    { $set: { nextRunAt: new Date(now.getTime() + 60_000) } },
    { new: true }
  );

  if (!locked) return;

  const appointment = await Appointment.findById(locked.appointmentId).lean();
  if (!appointment || appointment.status !== "booked") {
    await ReminderJob.updateOne({ _id: locked._id }, { $set: { status: "canceled", lastError: "canceled:appointment_not_booked" } });
    return;
  }

  const [clinic, patient, professional, specialty] = await Promise.all([
    Clinic.findById(appointment.clinicId).select("name address city phone").lean(),
    appointment.patientId ? Patient.findById(appointment.patientId).select("email firstName lastName").lean() : Promise.resolve(null),
    appointment.professionalId
      ? Professional.findById(appointment.professionalId).select("firstName lastName displayName").lean()
      : Promise.resolve(null),
    appointment.specialtyId ? Specialty.findById(appointment.specialtyId).select("name").lean() : Promise.resolve(null),
  ]);

  if (!patient?.email) {
    await ReminderJob.updateOne({ _id: locked._id }, { $set: { status: "canceled", lastError: "canceled:missing_email" } });
    return;
  }

  const clinicName = clinic?.name || "Clínica";
  const formattedStartAt = formatDate(appointment.startAt);
  const subject = `⏰ Recordatorio de turno — ${clinicName} — ${formattedStartAt}`;
  const professionalName = professional?.displayName || `${professional?.firstName ?? ""} ${professional?.lastName ?? ""}`.trim();
  const details = [
    specialty?.name ? `Especialidad: ${specialty.name}` : "",
    professionalName ? `Profesional: ${professionalName}` : "",
    clinic?.address ? `Dirección: ${clinic.address}` : "",
    clinic?.city ? `Ciudad: ${clinic.city}` : "",
    clinic?.phone ? `Teléfono: ${clinic.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const text = [
    `Hola ${appointment.patientFullName},`,
    `Te recordamos tu turno para el ${formattedStartAt}.`,
    details,
    `Gestioná tus turnos en: ${env.appBaseUrl}/patient/turnos`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const html = `<p>Hola ${appointment.patientFullName},</p><p>Te recordamos tu turno para el <strong>${formattedStartAt}</strong>.</p><pre style="font-family:inherit">${details}</pre><p><a href="${env.appBaseUrl}/patient/turnos">Ver mis turnos</a></p>`;

  try {
    const provider = getEmailProvider();
    const result = await provider.send({ to: [patient.email], subject, html, text });

    await Promise.all([
      ReminderJob.updateOne(
        { _id: locked._id },
        { $set: { status: "sent", providerMessageId: result.messageId, lastError: "", nextRunAt: new Date() } }
      ),
      ReminderLog.create({
        jobId: locked._id,
        appointmentId: locked.appointmentId,
        status: "sent",
        provider: provider.name,
        ...(result.messageId ? { providerMessageId: result.messageId } : {}),
        sentAt: new Date(),
      }),
    ]);
  } catch (error: any) {
    const attempts = locked.attempts + 1;
    const backoffMs = getBackoffMs(attempts);
    const willFail = attempts >= 5;

    await Promise.all([
      ReminderJob.updateOne(
        { _id: locked._id },
        {
          $set: {
            attempts,
            lastError: String(error?.message ?? "error_sending_reminder"),
            status: willFail ? "failed" : "pending",
            nextRunAt: willFail ? now : new Date(now.getTime() + backoffMs),
          },
        }
      ),
      ReminderLog.create({
        jobId: locked._id,
        appointmentId: locked.appointmentId,
        status: "failed",
        provider: env.emailProvider,
        error: String(error?.message ?? "error_sending_reminder"),
      }),
    ]);
  }
}

async function tick() {
  const due = await ReminderJob.find({ status: "pending", nextRunAt: { $lte: new Date() } })
    .sort({ nextRunAt: 1 })
    .limit(BATCH_SIZE)
    .select("_id")
    .lean();

  for (const job of due) {
    await processJob(String(job._id));
  }
}

export function startReminderWorker() {
  if (!env.reminderWorkerEnabled || timer) return;

  timer = setInterval(() => {
    tick().catch((error) => console.error("[reminderWorker]", error));
  }, env.reminderPollIntervalMs);

  tick().catch((error) => console.error("[reminderWorker]", error));
}

export function stopReminderWorker() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
