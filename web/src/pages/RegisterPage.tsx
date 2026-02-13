import { FormEvent, useState } from "react";
import { register } from "../api/auth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";

export function RegisterPage() {
  const { setSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await register({ name, email, password });
      setSession(data.token, data.clinic);
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <Card>
        <h1>Registrar clínica</h1>
        <form onSubmit={onSubmit}>
          <div className="form-row"><Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="form-row"><Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="form-row"><Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <p className="error">{error}</p>}
          <Button>Crear cuenta</Button>
        </form>
        <p><a href="/login">Ya tengo cuenta</a></p>
      </Card>
    </div>
  );
}
