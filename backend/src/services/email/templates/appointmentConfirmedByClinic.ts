import { AppointmentEmailPayload } from "../../../models/EmailJob";
import { buildIcsForAppointment, createAppointmentEmailLayout } from "../templateUtils";
import { EmailTemplateResult } from "../types";

export function appointmentConfirmedByClinicTemplate(payload: AppointmentEmailPayload): EmailTemplateResult {
  const subject = `✅ Turno confirmado por la clínica — ${payload.clinic.name}`;

  const base = createAppointmentEmailLayout({
    title: "La clínica confirmó tu turno",
    intro: `Hola ${payload.patient.firstName ?? ""}, tu turno fue confirmado por la clínica.`,
    payload,
    ctas: [{ label: "Ver mis turnos", url: payload.actions.myAppointmentsUrl }],
  });

  return { ...base, subject, ics: buildIcsForAppointment(payload) };
}
