import { useEffect, useState } from "react";
import { getReminderSettings, updateReminderSettings } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { ClinicReminderSettings } from "../types";
import { REMINDER_TEST_MODE } from "../config/env";

function defaultSettings(): ClinicReminderSettings {
  return {
    enabled: true,
    channels: { email: true },
    offsets: [
      { amount: 7, unit: "days" },
      { amount: 2, unit: "days" },
      { amount: 2, unit: "hours" },
    ],
  };
}

export function AdminNotificationsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<ClinicReminderSettings>(defaultSettings());
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getReminderSettings(token)
      .then(setSettings)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const onSave = async () => {
    if (!token) return;
    setError("");
    setMsg("");
    try {
      const saved = await updateReminderSettings(token, settings);
      setSettings(saved);
      setMsg("Configuración guardada");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card>
      <h2>Recordatorios automáticos</h2>
      {REMINDER_TEST_MODE && (
        <p style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 8, marginBottom: 12 }}>
          Modo prueba local activo (días→minutos y horas→segundos)
        </p>
      )}

      <label className="form-row">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
        />
        Habilitar recordatorios
      </label>

      <label className="form-row">
        <input
          type="checkbox"
          checked={settings.channels.email}
          onChange={(e) => setSettings((prev) => ({ ...prev, channels: { email: e.target.checked } }))}
        />
        Canal email
      </label>

      {settings.offsets.map((offset, index) => (
        <div key={`${offset.amount}-${offset.unit}-${index}`} className="form-row" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input
              type="number"
              value={offset.amount}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  offsets: prev.offsets.map((row, idx) => (idx === index ? { ...row, amount: Number(e.target.value) || 1 } : row)),
                }))
              }
              style={{ maxWidth: 120 }}
            />
            <select
              className="input"
              value={offset.unit}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  offsets: prev.offsets.map((row, idx) => (idx === index ? { ...row, unit: e.target.value as "days" | "hours" } : row)),
                }))
              }
            >
              <option value="days">Días</option>
              <option value="hours">Horas</option>
            </select>
            <Button onClick={() => setSettings((prev) => ({ ...prev, offsets: prev.offsets.filter((_, idx) => idx !== index) }))}>
              Eliminar
            </Button>
          </div>
        </div>
      ))}

      <div className="form-row" style={{ display: "flex", gap: 8 }}>
        <Button
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              offsets: [...prev.offsets, { amount: 1, unit: "days" }],
            }))
          }
          disabled={settings.offsets.length >= 5}
        >
          Agregar offset
        </Button>
        <Button onClick={onSave}>Guardar</Button>
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
    </Card>
  );
}
