import { type ReactElement, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@starter/ui";
import { useAuth } from "../auth/AuthContext";
import { salesApi } from "./sales-api";

export const SellerInvitePage = (): ReactElement => {
  const { token = "" } = useParams();
  const { accessToken } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void salesApi
      .invitation(token)
      .then((d) => {
        setName(`${d.firstName} ${d.lastName}`);
        setEmail(d.email);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);
  const accept = async () => {
    if (!accessToken) return;
    try {
      await salesApi.accept(accessToken, token);
      setMessage(
        "Invitación aceptada. Ya puedes ingresar a tu panel comercial.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <main className="nx-page">
      <Card
        title="Invitación al equipo comercial"
        subtitle={name ? `Hola, ${name}` : "Validando invitación..."}
      >
        {error && <p className="nx-state nx-state--error">{error}</p>}
        {message && <p className="nx-state nx-state--success">{message}</p>}
        {email && !accessToken && (
          <>
            <p>
              Crea tu usuario o inicia sesión con <strong>{email}</strong> y
              vuelve a este enlace.
            </p>
            <Link className="nx-btn" to="/register">
              Crear usuario
            </Link>{" "}
            <Link className="nx-btn-secondary" to="/login">
              Iniciar sesión
            </Link>
          </>
        )}
        {email && accessToken && !message && (
          <button className="nx-btn" onClick={() => void accept()}>
            Aceptar invitación
          </button>
        )}
        {message && (
          <Link className="nx-btn" to="/seller">
            Ir al panel
          </Link>
        )}
      </Card>
    </main>
  );
};
