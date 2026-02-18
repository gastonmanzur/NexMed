import { FormEvent, useEffect, useMemo, useState } from "react";
import { publicAvailability, publicCreateAppointment } from "../api/appointments";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { fmtDate } from "./helpers";

export function PublicBookingPage({ slug }: { slug: string }) {
  const { token } = useAuth();
  const [slots, setSlots] = useState<{ startAt: string; endAt: string }[]>([]);
  const [clinicName, setClinicName] = useState("Clínica");
  const [selected, setSelected] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const from = fmtDate(new Date());
  const to = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return fmtDate(d);
  }, []);

  const load = async () => {
    const data = await publicAvailability(slug, from, to);
    setClinicName(data.clinic.name);
    setSlots(data.slots);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [slug]);

  const grouped = useMemo(() => {
    return slots.reduce<Record<string, { startAt: string; endAt: string }[]>>((acc, item) => {
      const key = item.startAt.slice(0, 10);
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [slots]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await publicCreateAppointment(slug, { startAt: selected, patientFullName: fullName, patientPhone: phone, note }, token ?? undefined);
      setMsg("Turno reservado con éxito");
      setSelected("");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <Card>
        <h2>Reservá tu turno - {clinicName}</h2>
        {Object.entries(grouped).map(([day, daySlots]) => (
          <div key={day} className="form-row">
            <b>{new Date(day + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</b>
            <div className="slot-list">
              {daySlots.map((s) => (
                <button type="button" key={s.startAt} className={`slot ${selected === s.startAt ? "active" : ""}`} onClick={() => setSelected(s.startAt)}>
                  {new Date(s.startAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <h3>Datos del paciente</h3>
        <form onSubmit={submit}>
          <div className="form-row"><Input placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="form-row"><Input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="form-row"><Input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
          <Button disabled={!selected}>Confirmar turno</Button>
        </form>
      </Card>
    </div>
  );
}
