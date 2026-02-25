import { Types } from "mongoose";
import { env } from "../../config/env";
import { Appointment, AppointmentDocument } from "../../models/Appointment";
import { Clinic } from "../../models/Clinic";
import { EmailJob, EmailJobType } from "../../models/EmailJob";
import { Patient } from "../../models/Patient";
import { Professional } from "../../models/Professional";
import { Specialty } from "../../models/Specialty";

function dedupeKey(eventType: EmailJobType, appointment: AppointmentDocument) {
  return `${eventType}:${String(appointment._id)}:${appointment.updatedAt.toISOString()}`;
}

function withBase(url: string) {
  return `${env.appBaseUrl}${url}`;
}

async function buildPayload(appointment: AppointmentDocument) {
  const [clinic, patient, professional, specialty] = await Promise.all([
    Clinic.findById(appointment.clinicId).lean(),
    appointment.patientId ? Patient.findById(appointment.patientId).lean() : null,
    appointment.professionalId ? Professional.findById(appointment.professionalId).lean() : null,
    appointment.specialtyId ? Specialty.findById(appointment.specialtyId).lean() : null,
  ]);

  if (!clinic) return null;
  if (!patient?.email) return null;

  return {
    appointmentId: String(appointment._id),
    clinic: {
      name: clinic.name,
      slug: clinic.slug,
      address: clinic.address,
      city: clinic.city,
      phone: clinic.phone,
      email: clinic.email,
    },
    patient: {
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
    },
    professional: {
      fullName: professional?.displayName || `${professional?.firstName ?? ""} ${professional?.lastName ?? ""}`.trim() || "Profesional a confirmar",
    },
    specialty: specialty ? { name: specialty.name } : undefined,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    actions: {
      myAppointmentsUrl: withBase("/patient/turnos"),
      rescheduleUrl: withBase(`/patient/reprogramar/${String(appointment._id)}`),
      cancelUrl: withBase(`/patient/cancelar/${String(appointment._id)}`),
    },
  };
}

export async function enqueueEmailJobs(eventType: EmailJobType, appointmentInput: AppointmentDocument | string | Types.ObjectId) {
  const appointment =
    typeof appointmentInput === "string" || appointmentInput instanceof Types.ObjectId
      ? await Appointment.findById(appointmentInput)
      : appointmentInput;

  if (!appointment) return { queued: false };

  const payload = await buildPayload(appointment);
  if (!payload) return { queued: false };

  const recipients = [payload.patient.email, payload.clinic.email].filter(Boolean) as string[];
  if (!recipients.length) return { queued: false };

  const key = dedupeKey(eventType, appointment);

  await EmailJob.findOneAndUpdate(
    { dedupeKey: key },
    {
      $setOnInsert: {
        type: eventType,
        dedupeKey: key,
        to: recipients,
        payload,
        status: "pending",
        attempts: 0,
        nextRunAt: new Date(),
      },
    },
    { upsert: true, new: false }
  );

  return { queued: true, dedupeKey: key };
}
