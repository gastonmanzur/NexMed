import { FormEvent, useCallback, useState } from "react";
import { login, loginWithGoogle } from "../api/auth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { RETURN_TO_KEY } from "./JoinClinicPage";

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un error inesperado";

export function LoginPage() {
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectAfterLogin = (userType: "clinic" | "patient") => {
    const returnTo = localStorage.getItem(RETURN_TO_KEY);
    if (returnTo) {
      localStorage.removeItem(RETURN_TO_KEY);
      window.location.href = returnTo;
      return;
    }

    window.location.href = userType === "clinic" ? "/admin" : "/patient";
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login({ email, password });
      setSession(data.token, data.user);
      redirectAfterLogin(data.user.type);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = useCallback(async (credential: string) => {
    setError("");
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle({ credential });
      setSession(data.token, data.user);
      redirectAfterLogin(data.user.type);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }, [setSession]);

  const onGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <div className="page">
      <Card>
        <h1>Ingresar</h1>
        <div className="form-row">
          <p>Iniciar sesión con Google</p>
          <GoogleSignInButton onCredential={onGoogleCredential} onError={onGoogleError} text="signin_with" />
          {googleLoading && <p>Validando cuenta de Google...</p>}
        </div>
        <p>o continuá con email y contraseña</p>
        <form onSubmit={onSubmit}>
          <div className="form-row"><Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="form-row"><Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <p className="error">{error}</p>}
          <Button disabled={loading || googleLoading}>{loading ? "Ingresando..." : "Ingresar"}</Button>
        </form>
        <p><a href="/register">Crear cuenta</a></p>
      </Card>
    </div>
  );
}
