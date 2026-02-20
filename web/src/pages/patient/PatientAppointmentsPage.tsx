import { useEffect, useMemo, useState } from "react";

import { cancelMyAppointment, listMyAppointments } from "../../api/appointments";
import { listMyClinics } from "../../api/patientClinics";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import { Appointment, PatientClinic } from "../../types";

function isUpcoming(startAt: string) {
  return new Date(startAt).getTime() >= Date.now();
}

export function PatientAppointmentsPage() {
  const { logout, token, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<PatientClinic[]>([]);
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "past">("upcoming");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [error, setError] = useState("");

  const clinicById = useMemo(() => {
    const map = new Map<string, PatientClinic>();
    clinics.forEach((clinic) => map.set(clinic._id, clinic));
    return map;
  }, [clinics]);

  const loadData = async () => {
    if (!token) return;
    const [appointmentData, clinicData] = await Promise.all([listMyAppointments(token), listMyClinics(token)]);
    setAppointments(appointmentData);
    setClinics(clinicData);
  };

  useEffect(() => {
    loadData().catch((e: Error) => setError(e.message));
  }, [token]);

  const filteredAppointments = appointments.filter((appointment) => {
    const upcoming = isUpcoming(appointment.startAt);
    if (timeFilter === "upcoming" && !upcoming) return false;
    if (timeFilter === "past" && upcoming) return false;
    if (clinicFilter !== "all" && appointment.clinicId !== clinicFilter) return false;
    return true;
  });

  const onCancel = async (appointmentId: string) => {
    if (!token) return;
    setError("");
    try {
      await cancelMyAppointment(token, appointmentId);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {user && <Navbar user={user} onLogout={onLogout} />}
      <div className="page">
        <Card>
          <h2>Mis Turnos</h2>
          <p>Consultá tus próximos turnos y el historial de atención.</p>
          <div className="form-row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => setTimeFilter("upcoming")} disabled={timeFilter === "upcoming"}>Próximos</Button>
            <Button onClick={() => setTimeFilter("past")} disabled={timeFilter === "past"}>Pasados</Button>
            <select className="input" value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)} style={{ maxWidth: 260 }}>
              <option value="all">Todas las clínicas</option>
              {clinics.map((clinic) => (
                <option key={clinic._id} value={clinic._id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="error">{error}</p>}
          {!filteredAppointments.length && !error && <p>No tenés turnos.</p>}

          {filteredAppointments.map((appointment) => {
            const clinic = clinicById.get(appointment.clinicId);
            const canCancel = appointment.status === "confirmed" && isUpcoming(appointment.startAt);
            return (
              <div key={appointment._id} className="form-row" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div>
                  <b>{clinic?.name ?? "Clínica"}</b>
                  <div>{new Date(appointment.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</div>
                  <div>Estado: {appointment.status === "confirmed" ? "Confirmado" : "Cancelado"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <a className="btn" href={`/c/${appointment.clinicSlug || clinic?.slug || ""}`}>Ver detalles</a>
                  <Button onClick={() => onCancel(appointment._id)} disabled={!canCancel}>Cancelar</Button>
                  <a className="btn" href={`/patient/reschedule?appointmentId=${appointment._id}`}>Reprogramar</a>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
