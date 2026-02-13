import { useEffect, useState } from "react";
import { cancelAppointment, listAppointments } from "../api/appointments";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { Appointment } from "../types";
import { fmtDate, humanDate } from "./helpers";

export function AdminAppointmentsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const from = fmtDate(new Date());
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 14);
    const to = fmtDate(toDate);
    const data = await listAppointments(token!, from, to, q);
    setItems(data);
  };

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <Card>
      <h3>Turnos</h3>
      <div className="grid-2">
        <Input placeholder="Buscar por teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={load}>Buscar</Button>
      </div>
      <table className="table">
        <thead><tr><th>Fecha</th><th>Paciente</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a._id}>
              <td>{humanDate(a.startAt)}</td>
              <td>{a.patientFullName}</td>
              <td>{a.patientPhone}</td>
              <td>{a.status}</td>
              <td>{a.status === "confirmed" && <Button onClick={async () => { await cancelAppointment(token!, a._id); load(); }}>Cancelar</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
