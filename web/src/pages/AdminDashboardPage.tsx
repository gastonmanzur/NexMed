import { useEffect, useMemo, useState } from "react";
import { listAppointments } from "../api/appointments";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";
import { Appointment } from "../types";
import { fmtDate, humanDate, rangeDays } from "./helpers";

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const end = new Date(now);
    end.setDate(end.getDate() + 8);
    listAppointments(token!, fmtDate(start), fmtDate(end)).then(setItems).catch(() => setItems([]));
  }, [token]);

  const today = fmtDate(new Date());
  const todayCount = items.filter((a) => a.startAt.slice(0, 10) === today && a.status === "confirmed").length;
  const weekCount = items.filter((a) => a.status === "confirmed").length;

  const days = useMemo(() => rangeDays(new Date(), 7), []);

  return (
    <>
      <Card>
        <h3>Métricas</h3>
        <p>Turnos hoy: <b>{todayCount}</b></p>
        <p>Turnos semana: <b>{weekCount}</b></p>
      </Card>
      <Card>
        <h3>Agenda semanal</h3>
        {days.map((d) => {
          const key = fmtDate(d);
          const dayItems = items.filter((a) => a.startAt.slice(0, 10) === key);
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <b>{d.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" })}</b>
              {dayItems.length === 0 ? <div>Sin turnos</div> : dayItems.map((a) => <div key={a._id}>{humanDate(a.startAt)} - {a.patientFullName} ({a.status})</div>)}
            </div>
          );
        })}
      </Card>
    </>
  );
}
