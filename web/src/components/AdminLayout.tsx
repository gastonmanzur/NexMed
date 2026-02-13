import { useAuth } from "../hooks/useAuth";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clinic, user, logout } = useAuth();

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>Turnos SaaS</h2>
          <small>{clinic?.name} · {user?.type === "clinic" ? "Consultorio/Clínica" : "Paciente"}</small>
        </div>
        <nav>
          <a href="/admin">Dashboard</a> | <a href="/admin/appointments">Turnos</a> | <a href="/admin/settings">Configuración</a> |{" "}
          <button onClick={logout}>Salir</button>
        </nav>
      </header>
      {children}
    </div>
  );
}
