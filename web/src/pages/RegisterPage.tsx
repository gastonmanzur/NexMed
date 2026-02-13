import { FormEvent, useMemo, useState } from "react";
import { loginWithGoogle, register } from "../api/auth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";

type RegisterType = "clinic" | "patient";

export function RegisterPage() {
  const { setSession } = useAuth();
  const [type, setType] = useState<RegisterType>("clinic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const buttonText = useMemo(() => (type === "clinic" ? "Crear cuenta de consultorio" : "Crear cuenta de paciente"), [type]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !phone) {
      setError("Completá los campos obligatorios.");
      return;
    }

    if (type === "clinic" && (!name || !address || !city)) {
      setError("Completá nombre, dirección y ciudad.");
      return;
    }

    if (type === "patient") {
      const numericAge = Number(age);
      if (!firstName || !lastName || Number.isNaN(numericAge) || numericAge < 0 || numericAge > 120) {
        setError("Completá los datos de paciente correctamente.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload =
        type === "clinic"
          ? { type, name, email, password, phone, address, city }
          : { type, email, password, firstName, lastName, age: Number(age), phone };

      const data = await register(payload as any);
      setSession(data.token, data.user);
      window.location.href = data.user.type === "clinic" ? "/admin" : "/patient";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    setError("");
    setGoogleLoading(true);
    try {
      const data = await loginWithGoogle({ credential });
      setSession(data.token, data.user);
      window.location.href = "/patient";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="page">
      <Card>
        <h1>Registro</h1>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <label><input type="radio" checked={type === "clinic"} onChange={() => setType("clinic")} /> Consultorio/Clínica</label>
            <label><input type="radio" checked={type === "patient"} onChange={() => setType("patient")} /> Paciente</label>
          </div>

          {type === "patient" && (
            <div className="form-row">
              <GoogleSignInButton onCredential={onGoogleCredential} text="signup_with" />
              {googleLoading && <p>Validando cuenta de Google...</p>}
            </div>
          )}

          {type === "clinic" && <div className="form-row"><Input placeholder="Nombre del consultorio" value={name} onChange={(e) => setName(e.target.value)} /></div>}
          {type === "patient" && (
            <>
              <div className="form-row"><Input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="form-row"><Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              <div className="form-row"><Input type="number" placeholder="Edad" value={age} onChange={(e) => setAge(e.target.value)} /></div>
            </>
          )}

          <div className="form-row"><Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="form-row"><Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="form-row"><Input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>

          {type === "clinic" && (
            <>
              <div className="form-row"><Input placeholder="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div className="form-row"><Input placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} /></div>
            </>
          )}

          {error && <p className="error">{error}</p>}
          <Button disabled={loading || googleLoading}>{loading ? "Creando..." : buttonText}</Button>
        </form>
        <p><a href="/login">Ya tengo cuenta</a></p>
      </Card>
    </div>
  );
}
