import { FormEvent, useState } from "react";
import { login } from "../api/auth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login({ email, password });
      setSession(data.token, data.user);
      window.location.href = data.user.type === "clinic" ? "/admin" : "/patient";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Card>
        <h1>Ingresar</h1>
        <form onSubmit={onSubmit}>
          <div className="form-row"><Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="form-row"><Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <p className="error">{error}</p>}
          <Button disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</Button>
        </form>
        <p><a href="/register">Crear cuenta</a></p>
      </Card>
    </div>
  );
}
