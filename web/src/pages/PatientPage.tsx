import { useEffect, useMemo, useState } from "react";
import { listMyAppointments, publicAvailabilityByClinicId, rescheduleMyAppointment } from "../api/appointments";
import { listMyClinics } from "../api/patientClinics";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { Appointment, PatientClinic } from "../types";
import { fmtDate } from "./helpers";

export function PatientPage() {
  const { logout, token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<PatientClinic[]>([]);
  const [slots, setSlots] = useState<{ startAt: string; endAt: string }[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const from = fmtDate(new Date());
  const to = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return fmtDate(d);
  }, []);

  const loadAppointments = async () => {
    if (!token) return;
    const data = await listMyAppointments(token);
    setAppointments(data.filter((a) => a.status === "confirmed"));
    if (!selectedAppointmentId && data.length) setSelectedAppointmentId(data[0]._id);
  };

  const loadClinics = async () => {
    if (!token) return;
    const data = await listMyClinics(token);
    setClinics(data);
  };

  const loadSlots = async (clinicId: string) => {
    const data = await publicAvailabilityByClinicId(clinicId, from, to);
    setSlots(data.slots);
  };

  useEffect(() => {
    loadAppointments().catch((e) => setError(e.message));
    loadClinics().catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    const selected = appointments.find((a) => a._id === selectedAppointmentId);
    if (!selected) return;
    loadSlots(selected.clinicId).catch((e) => setError(e.message));
  }, [appointments, selectedAppointmentId]);

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const onReschedule = async () => {
    if (!token || !selectedAppointmentId || !selectedSlot) return;
    setError("");
    setMsg("");
    try {
      await rescheduleMyAppointment(token, selectedAppointmentId, { startAt: selectedSlot });
      setMsg("Turno reprogramado con éxito");
      setSelectedSlot("");
      await loadAppointments();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="page">
      <div className="topbar">
        <h2>Área paciente</h2>
        <Button onClick={onLogout}>Cerrar sesión</Button>
      </div>
      <Card>
        <h3>Mis clínicas</h3>
        {!clinics.length && <p>Todavía no te uniste a ninguna clínica.</p>}
        {clinics.map((clinic) => (
          <div key={clinic._id} className="form-row">
            <div>
              <b>{clinic.name}</b>
              <div>{clinic.city}</div>
              <div>{clinic.address}</div>
              <div>{clinic.phone}</div>
            </div>
            <Button onClick={() => { window.location.href = `/c/${clinic.slug}`; }}>Reservar turno</Button>
          </div>
        ))}
      </Card>
      <Card>
        <h3>Mis turnos</h3>
        {!appointments.length && <p>No tenés turnos confirmados.</p>}
        {appointments.map((a) => (
          <label key={a._id} className="form-row" style={{ display: "block" }}>
            <input
              type="radio"
              name="appointment"
              value={a._id}
              checked={selectedAppointmentId === a._id}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
            />{" "}
            {new Date(a.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}
          </label>
        ))}
      </Card>
      <Card>
        <h3>Reprogramar turno</h3>
        <div className="slot-list">
          {slots.map((s) => (
            <button key={s.startAt} type="button" className={`slot ${selectedSlot === s.startAt ? "active" : ""}`} onClick={() => setSelectedSlot(s.startAt)}>
              {new Date(s.startAt).toLocaleString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <Button onClick={onReschedule} disabled={!selectedAppointmentId || !selectedSlot}>Reprogramar (cancelar + nuevo horario)</Button>
      </Card>
    </div>
  );
}
