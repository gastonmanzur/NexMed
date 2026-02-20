import { useEffect, useMemo, useState } from "react";

import { listMyAppointments, publicAvailabilityByClinicIdWithFilters, rescheduleMyAppointment } from "../../api/appointments";
import { listMyClinics } from "../../api/patientClinics";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import { Appointment, PatientClinic } from "../../types";
import { fmtDate } from "../helpers";

function isUpcoming(startAt: string) {
  return new Date(startAt).getTime() >= Date.now();
}

export function PatientReschedulePage() {
  const { logout, token, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<PatientClinic[]>([]);
  const [slots, setSlots] = useState<{ startAt: string; endAt: string }[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const preselectedAppointmentId = useMemo(() => new URLSearchParams(window.location.search).get("appointmentId") ?? "", []);

  const from = fmtDate(new Date());
  const to = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return fmtDate(d);
  }, []);

  const clinicById = useMemo(() => {
    const map = new Map<string, PatientClinic>();
    clinics.forEach((clinic) => map.set(clinic._id, clinic));
    return map;
  }, [clinics]);

  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "confirmed" && isUpcoming(appointment.startAt)),
    [appointments]
  );

  const selectedAppointment = upcomingAppointments.find((appointment) => appointment._id === selectedAppointmentId);

  const loadData = async () => {
    if (!token) return;
    const [appointmentData, clinicData] = await Promise.all([listMyAppointments(token), listMyClinics(token)]);
    setAppointments(appointmentData);
    setClinics(clinicData);

    if (preselectedAppointmentId) {
      setSelectedAppointmentId(preselectedAppointmentId);
      return;
    }

    const firstAvailable = appointmentData.find((appointment) => appointment.status === "confirmed" && isUpcoming(appointment.startAt));
    if (firstAvailable) {
      setSelectedAppointmentId(firstAvailable._id);
    }
  };

  useEffect(() => {
    loadData().catch((e: Error) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (!selectedAppointment) {
      setSlots([]);
      return;
    }

    publicAvailabilityByClinicIdWithFilters(selectedAppointment.clinicId, from, to, {
      professionalId: selectedAppointment.professionalId || undefined,
      specialtyId: selectedAppointment.specialtyId || undefined,
    })
      .then((data) => setSlots(data.slots.filter((slot) => slot.startAt !== selectedAppointment.startAt)))
      .catch((e: Error) => setError(e.message));
  }, [selectedAppointmentId, selectedAppointment?.clinicId, selectedAppointment?.professionalId, selectedAppointment?.specialtyId]);

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const onReschedule = async () => {
    if (!token || !selectedAppointment || !selectedSlot) return;

    setError("");
    setMsg("");
    try {
      await rescheduleMyAppointment(token, selectedAppointment._id, { startAt: selectedSlot });
      setMsg("Turno reprogramado con éxito.");
      setSelectedSlot("");
      await loadData();
      window.history.replaceState({}, "", "/patient/reschedule");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const shouldShowSelector = !preselectedAppointmentId;

  return (
    <>
      {user && <Navbar user={user} onLogout={onLogout} />}
      <div className="page">
        <Card>
          <h2>Reprogramar Turnos</h2>
          <p>Seleccioná un turno y elegí un nuevo horario disponible sin perder contexto.</p>

          {shouldShowSelector && (
            <>
              <h3>Paso 1: Elegí un turno a reprogramar</h3>
              {!upcomingAppointments.length && <p>No hay turnos para reprogramar.</p>}
              {upcomingAppointments.map((appointment) => {
                const clinic = clinicById.get(appointment.clinicId);
                const isSelected = selectedAppointmentId === appointment._id;
                return (
                  <div key={appointment._id} className="form-row" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <b>{clinic?.name ?? "Clínica"}</b>
                      <div>{new Date(appointment.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </div>
                    <Button onClick={() => setSelectedAppointmentId(appointment._id)} disabled={isSelected}>
                      {isSelected ? "Elegido" : "Elegir"}
                    </Button>
                  </div>
                );
              })}
            </>
          )}

          {selectedAppointment && (
            <>
              <h3>Paso 2: Confirmá el turno seleccionado</h3>
              <div className="form-row">
                <div>Clínica: <b>{clinicById.get(selectedAppointment.clinicId)?.name ?? "No disponible"}</b></div>
                <div>Profesional: <b>{selectedAppointment.professionalName || "A confirmar"}</b></div>
                <div>Especialidad: <b>{selectedAppointment.specialtyId || "No informada"}</b></div>
                <div>Fecha actual: <b>{new Date(selectedAppointment.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</b></div>
              </div>

              <h3>Paso 3: Elegí un nuevo horario</h3>
              {!slots.length && <p>No hay horarios disponibles para este turno en los próximos días.</p>}
              <div className="slot-list">
                {slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    className={`slot ${selectedSlot === slot.startAt ? "active" : ""}`}
                    onClick={() => setSelectedSlot(slot.startAt)}
                  >
                    {new Date(slot.startAt).toLocaleString("es-AR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>

              <h3>Paso 4: Confirmar reprogramación</h3>
              <Button onClick={onReschedule} disabled={!selectedSlot}>Reprogramar (cancelar + nuevo horario)</Button>
            </>
          )}

          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
        </Card>
      </div>
    </>
  );
}
