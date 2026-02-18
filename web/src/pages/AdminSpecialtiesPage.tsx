import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSpecialty, deleteSpecialty, listSpecialties, updateSpecialty } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { Specialty } from "../types";

export function AdminSpecialtiesPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    const data = await listSpecialties(token);
    setRows(data);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    try {
      await createSpecialty(token, { name, description: description || undefined });
      setName("");
      setDescription("");
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const onEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;
    setError("");
    try {
      await updateSpecialty(token, editing._id, {
        name: editing.name,
        description: editing.description || "",
        isActive: editing.isActive,
      });
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Card>
        <h3>Especialidades</h3>
        <form onSubmit={onCreate}>
          <div className="grid-2">
            <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            <Button>Crear especialidad</Button>
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </Card>
      <Card>
        <Input placeholder="Buscar por nombre" value={search} onChange={(e) => setSearch(e.target.value)} />
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row._id}>
                <td>{row.name}</td>
                <td>{row.isActive ? "Activa" : "Inactiva"}</td>
                <td>
                  <button onClick={() => setEditing(row)}>Editar</button>{" "}
                  <button onClick={async () => token && (await updateSpecialty(token, row._id, { isActive: !row.isActive }).then(load))}>
                    {row.isActive ? "Desactivar" : "Activar"}
                  </button>{" "}
                  <button onClick={async () => token && (await deleteSpecialty(token, row._id).then(load))}>Soft delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing && (
        <Card>
          <h4>Editar especialidad</h4>
          <form onSubmit={onEdit}>
            <div className="grid-2">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div className="form-row" style={{ marginTop: 8 }}>
              <Button>Guardar</Button>
              <button type="button" onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
