import { AppointmentEmailPayload } from "../../../models/EmailJob";
import { buildIcsForAppointment, createAppointmentEmailLayout } from "../templateUtils";
import { EmailTemplateResult } from "../types";

export function appointmentRescheduledTemplate(payload: AppointmentEmailPayload): EmailTemplateResult {
  const subject = `🔁 Turno reprogramado — ${payload.clinic.name}`;
  const ctas = [
    { label: "Ver mis turnos", url: payload.actions.myAppointmentsUrl },
    { label: "Reprogramar", url: payload.actions.rescheduleUrl },
    ...(payload.actions.cancelUrl ? [{ label: "Cancelar", url: payload.actions.cancelUrl }] : []),
  ];
  const base = createAppointmentEmailLayout({
    title: "Tu turno fue reprogramado",
    intro: `Hola ${payload.patient.firstName ?? ""}, actualizamos la fecha de tu turno.`,
    payload,
    ctas,
  });

  return { ...base, subject, ics: buildIcsForAppointment(payload) };
}
