import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";

export function PatientPage() {
  const { logout } = useAuth();

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="page">
      <div className="topbar">
        <h2>Área paciente</h2>
        <Button onClick={onLogout}>Cerrar sesión</Button>
      </div>
      <Card>
        <h1>Portal de Paciente (próximamente)</h1>
      </Card>
    </div>
  );
}
