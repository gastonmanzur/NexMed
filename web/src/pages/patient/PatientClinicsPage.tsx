import { useEffect, useState } from "react";

import { listMyClinics } from "../../api/patientClinics";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import { PatientClinic } from "../../types";

export function PatientClinicsPage() {
  const { logout, token, user } = useAuth();
  const [clinics, setClinics] = useState<PatientClinic[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    listMyClinics(token)
      .then(setClinics)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {user && <Navbar user={user} onLogout={onLogout} />}
      <div className="page">
        <Card>
          <h2>Mis Clínicas</h2>
          <p>Gestioná tus clínicas vinculadas y reservá nuevos turnos rápidamente.</p>
          {error && <p className="error">{error}</p>}
          {!clinics.length && !error && <p>Todavía no tenés clínicas.</p>}
          {clinics.map((clinic) => (
            <div key={clinic._id} className="form-row" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <b>{clinic.name}</b>
                <div>{clinic.city}</div>
                <div>{clinic.address}</div>
                <div>{clinic.phone}</div>
              </div>
              <a className="btn" href={`/c/${clinic.slug}`}>
                Reservar turno
              </a>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
