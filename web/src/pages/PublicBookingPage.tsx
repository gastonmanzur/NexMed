import { FormEvent, useEffect, useMemo, useState } from "react";
import { publicAvailability, publicCreateAppointment } from "../api/appointments";
import { listPublicProfessionals, listPublicSpecialties } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { Professional, Specialty } from "../types";
import { fmtDate } from "./helpers";

export function PublicBookingPage({ slug }: { slug: string }) {
  const { token } = useAuth();
  const [slots, setSlots] = useState<{ startAt: string; endAt: string; professionalId?: string }[]>([]);
  const [clinicName, setClinicName] = useState("Clínica");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedSpecialtyId(params.get("specialtyId") || "");
    setSelectedProfessionalId(params.get("professionalId") || "");
  }, []);

  const load = async (filters?: { specialtyId?: string; professionalId?: string }) => {
    const [availability, specRows, profRows] = await Promise.all([
      publicAvailability(slug, from, to, filters),
      listPublicSpecialties(slug),
      listPublicProfessionals(slug),
    ]);
    setClinicName(availability.clinic.name);
    setSlots(availability.slots);
    setSpecialties(specRows);
    setProfessionals(profRows);
  };

  useEffect(() => {
    load({
      specialtyId: selectedSpecialtyId || undefined,
      professionalId: selectedProfessionalId || undefined,
    }).catch((e) => setError(e.message));
  }, [slug, selectedSpecialtyId, selectedProfessionalId]);

  const filteredProfessionals = useMemo(() => {
    if (!selectedSpecialtyId) return professionals;
    return professionals.filter((p) => p.specialtyIds.includes(selectedSpecialtyId));
  }, [professionals, selectedSpecialtyId]);

  useEffect(() => {
    if (selectedProfessionalId && !filteredProfessionals.some((p) => p._id === selectedProfessionalId)) {
      setSelectedProfessionalId("");
    }
  }, [selectedSpecialtyId, professionals]);

  const grouped = useMemo(() => {
    return slots.reduce<Record<string, { startAt: string; endAt: string; professionalId?: string }[]>>((acc, item) => {
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
      await publicCreateAppointment(
        slug,
        {
          startAt: selected,
          patientFullName: fullName,
          patientPhone: phone,
          note,
          professionalId: selectedProfessionalId || undefined,
          specialtyId: selectedSpecialtyId || undefined,
        },
        token ?? undefined
      );
      setMsg("Turno reservado con éxito");
      setSelected("");
      await load({
        specialtyId: selectedSpecialtyId || undefined,
        professionalId: selectedProfessionalId || undefined,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <Card>
        <h2>Reservá tu turno - {clinicName}</h2>
        <div className="grid-2">
          <select className="input" value={selectedSpecialtyId} onChange={(e) => setSelectedSpecialtyId(e.target.value)}>
            <option value="">Todas las especialidades</option>
            {specialties.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="input" value={selectedProfessionalId} onChange={(e) => setSelectedProfessionalId(e.target.value)}>
            <option value="">Todos los profesionales</option>
            {filteredProfessionals.map((p) => (
              <option key={p._id} value={p._id}>{p.displayName || `${p.firstName} ${p.lastName}`}</option>
            ))}
          </select>
        </div>
        {Object.entries(grouped).map(([day, daySlots]) => (
          <div key={day} className="form-row">
            <b>{new Date(day + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</b>
            <div className="slot-list">
              {daySlots.map((s) => (
                <button type="button" key={`${s.startAt}-${s.professionalId || "na"}`} className={`slot ${selected === s.startAt ? "active" : ""}`} onClick={() => setSelected(s.startAt)}>
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
