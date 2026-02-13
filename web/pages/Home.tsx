import { useEffect, useState } from "react";

type AppConfig = { ok: boolean; name: string; version: string };

export default function Home() {
  const [data, setData] = useState<AppConfig | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:5000/api/public/app-config")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>NexMed Turnos</h1>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {!data && !err && <p>Cargando...</p>}
      {data && (
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
