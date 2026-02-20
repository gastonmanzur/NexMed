import { useEffect, useMemo, useState } from "react";
import { getNotificationSettings, updateNotificationSettings } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { ClinicNotificationSettings, NotificationRule } from "../types";

function defaultSettings(): ClinicNotificationSettings {
  return {
    clinicId: "",
    timezone: "America/Argentina/Buenos_Aires",
    remindersEnabled: true,
    rules: [],
  };
}

export function AdminNotificationsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<ClinicNotificationSettings>(defaultSettings());
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getNotificationSettings(token)
      .then(setSettings)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const previewRows = useMemo(() => {
    const appointment = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    return settings.rules.map((rule) => {
      const ms = rule.offsetUnit === "days" ? rule.offsetValue * 24 * 60 * 60 * 1000 : rule.offsetValue * 60 * 60 * 1000;
      const scheduled = new Date(appointment.getTime() - ms);
      return `${rule.enabled ? "✅" : "⏸️"} ${rule.offsetValue} ${rule.offsetUnit} (${rule.channel}) → ${scheduled.toLocaleString("es-AR")}`;
    });
  }, [settings.rules]);

  const updateRule = (index: number, patch: Partial<NotificationRule>) => {
    setSettings((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, idx) => (idx === index ? { ...rule, ...patch } : rule)),
    }));
  };

  const addRule = () => {
    setSettings((prev) => ({
      ...prev,
      rules: [...prev.rules, { id: `rule-${Date.now()}`, enabled: true, offsetValue: 1, offsetUnit: "days", channel: "inApp" }],
    }));
  };

  const removeRule = (index: number) => {
    setSettings((prev) => ({ ...prev, rules: prev.rules.filter((_, idx) => idx !== index) }));
  };

  const onSave = async () => {
    if (!token) return;
    setError("");
    setMsg("");
    try {
      const payload = {
        remindersEnabled: settings.remindersEnabled,
        timezone: settings.timezone,
        rules: settings.rules,
      };
      const saved = await updateNotificationSettings(token, payload);
      setSettings(saved);
      setMsg("Configuración guardada");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Card>
      <h2>Notificaciones</h2>
      <label className="form-row">
        <input
          type="checkbox"
          checked={settings.remindersEnabled}
          onChange={(e) => setSettings((prev) => ({ ...prev, remindersEnabled: e.target.checked }))}
        />
        Recordatorios habilitados
      </label>
      <div className="form-row">
        <label>Zona horaria</label>
        <Input value={settings.timezone} onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))} />
      </div>

      {settings.rules.map((rule, index) => (
        <div key={rule.id} className="form-row" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
          <label>
            <input type="checkbox" checked={rule.enabled} onChange={(e) => updateRule(index, { enabled: e.target.checked })} /> Habilitada
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input
              type="number"
              value={rule.offsetValue}
              onChange={(e) => updateRule(index, { offsetValue: Number(e.target.value) || 1 })}
              style={{ maxWidth: 120 }}
            />
            <select className="input" value={rule.offsetUnit} onChange={(e) => updateRule(index, { offsetUnit: e.target.value as "days" | "hours" })}>
              <option value="days">Días</option>
              <option value="hours">Horas</option>
            </select>
            <select className="input" value={rule.channel} onChange={(e) => updateRule(index, { channel: e.target.value as "inApp" | "email" })}>
              <option value="inApp">In app</option>
              <option value="email">Email</option>
            </select>
            <Button onClick={() => removeRule(index)}>Eliminar</Button>
          </div>
        </div>
      ))}

      <div className="form-row" style={{ display: "flex", gap: 8 }}>
        <Button onClick={addRule}>Agregar regla</Button>
        <Button onClick={onSave}>Guardar</Button>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <h3>Vista previa (turno en 15 días)</h3>
      {!previewRows.length && <p>Sin reglas configuradas.</p>}
      {previewRows.map((row) => (
        <div key={row}>{row}</div>
      ))}
    </Card>
  );
}
