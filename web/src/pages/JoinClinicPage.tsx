import { useEffect, useState } from "react";
import { joinClinicByToken } from "../api/patientClinics";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";

export const RETURN_TO_KEY = "turnos_return_to";

export function JoinClinicPage({ token: joinToken }: { token: string }) {
  const { token, user } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!joinToken) {
      setError("Token inválido");
      return;
    }

    if (!token) {
      localStorage.setItem(RETURN_TO_KEY, `/join/${joinToken}`);
      window.location.replace("/login");
      return;
    }

    if (!user) {
      return;
    }

    if (user.type !== "patient") {
      setError("Solo los pacientes pueden usar enlaces de invitación.");
      return;
    }

    joinClinicByToken(token, { token: joinToken })
      .then((clinic) => {
        window.location.replace(`/c/${clinic.slug}`);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "No se pudo unir la clínica";
        setError(message);
      });
  }, [joinToken, token, user]);

  return (
    <div className="page">
      <Card>
        <h2>Unirse a clínica</h2>
        {error ? <p className="error">{error}</p> : <p>Procesando invitación...</p>}
      </Card>
    </div>
  );
}
