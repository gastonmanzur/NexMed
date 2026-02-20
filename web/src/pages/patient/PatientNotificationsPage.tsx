import { useEffect, useState } from "react";
import { listPatientNotifications } from "../../api/notifications";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import { PatientNotification } from "../../types";

export function PatientNotificationsPage() {
  const { logout, token, user } = useAuth();
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    listPatientNotifications(token)
      .then(setNotifications)
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
          <h2>Notificaciones</h2>
          {error && <p className="error">{error}</p>}
          {!notifications.length && !error && <p>No hay notificaciones todavía.</p>}
          {notifications.map((item) => (
            <div key={item._id} className="form-row" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
              <b>Recordatorio de turno</b>
              <div>{item.payloadSnapshot.clinicName}</div>
              <div>{new Date(item.payloadSnapshot.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
