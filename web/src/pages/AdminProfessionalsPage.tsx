import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProfessional,
  listProfessionals,
  listSpecialties,
  updateProfessional,
} from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { Professional, Specialty } from "../types";

export function AdminProfessionalsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", specialtyIds: [] as string[] });
  const [error, setError] = useState("");

  const specialtyMap = useMemo(() => new Map(specialties.map((s) => [s._id, s.name])), [specialties]);

  const load = async () => {
    if (!token) return;
    const [p, s] = await Promise.all([listProfessionals(token), listSpecialties(token)]);
    setRows(p);
    setSpecialties(s);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  const toggleSpec = (id: string, target: { specialtyIds: string[] }) => {
    const has = target.specialtyIds.includes(id);
    const next = has ? target.specialtyIds.filter((x) => x !== id) : [...target.specialtyIds, id];
    if (next.length === 0) {
      setError("Debe tener al menos una especialidad");
      return target.specialtyIds;
    }
    return next;
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    if (form.specialtyIds.length === 0) return setError("Debe seleccionar al menos una especialidad");

    try {
      await createProfessional(token, form);
      setForm({ firstName: "", lastName: "", email: "", phone: "", specialtyIds: [] });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Card>
        <h3>Profesionales</h3>
        <form onSubmit={onCreate}>
          <div className="grid-2">
            <Input placeholder="Nombre" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            <Input placeholder="Apellido" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            {specialties.map((s) => (
              <label key={s._id} style={{ marginRight: 8 }}>
                <input
                  type="checkbox"
                  checked={form.specialtyIds.includes(s._id)}
                  onChange={() => setForm((p) => ({ ...p, specialtyIds: toggleSpec(s._id, p) }))}
                /> {s.name}
              </label>
            ))}
          </div>
          <Button>Crear profesional</Button>
        </form>
        {error && <p className="error">{error}</p>}
      </Card>

      <Card>
        <table className="table">
          <thead>
            <tr><th>Nombre</th><th>Especialidades</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                <td>{row.displayName || `${row.firstName} ${row.lastName}`}</td>
                <td>{row.specialtyIds.map((id) => specialtyMap.get(id) ?? id).join(", ")}</td>
                <td>{row.isActive ? "Activo" : "Inactivo"}</td>
                <td>
                  <button onClick={() => setEditing(row)}>Editar</button>{" "}
                  <button onClick={async () => token && (await updateProfessional(token, row._id, { isActive: !row.isActive }).then(load))}>
                    {row.isActive ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing && (
        <Card>
          <h4>Editar profesional</h4>
          <div className="grid-2">
            <Input value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} />
            <Input value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} />
            <Input value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            {specialties.map((s) => (
              <label key={s._id} style={{ marginRight: 8 }}>
                <input
                  type="checkbox"
                  checked={editing.specialtyIds.includes(s._id)}
                  onChange={() => setEditing((p) => (p ? { ...p, specialtyIds: toggleSpec(s._id, p) } : p))}
                /> {s.name}
              </label>
            ))}
          </div>
          <Button
            onClick={async () => {
              if (!token || !editing) return;
              await updateProfessional(token, editing._id, {
                firstName: editing.firstName,
                lastName: editing.lastName,
                email: editing.email,
                phone: editing.phone,
                specialtyIds: editing.specialtyIds,
                isActive: editing.isActive,
              });
              setEditing(null);
              await load();
            }}
          >Guardar</Button>
          <button onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>Cancelar</button>
        </Card>
      )}
    </>
  );
}
