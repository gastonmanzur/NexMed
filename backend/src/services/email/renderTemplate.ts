import { EmailJobDocument } from "../../models/EmailJob";
import { appointmentBookedTemplate } from "./templates/appointmentBooked";
import { appointmentCanceledTemplate } from "./templates/appointmentCanceled";
import { appointmentConfirmedByClinicTemplate } from "./templates/appointmentConfirmedByClinic";
import { appointmentRescheduledTemplate } from "./templates/appointmentRescheduled";

export function renderTemplate(job: EmailJobDocument) {
  if (job.type === "appointment.booked") return appointmentBookedTemplate(job.payload);
  if (job.type === "appointment.rescheduled") return appointmentRescheduledTemplate(job.payload);
  if (job.type === "appointment.confirmed_by_clinic") return appointmentConfirmedByClinicTemplate(job.payload);
  return appointmentCanceledTemplate(job.payload);
}
