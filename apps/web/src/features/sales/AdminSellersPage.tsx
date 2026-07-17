import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import { Card } from "@starter/ui";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { salesApi, type Seller } from "./sales-api";

export const AdminSellersPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Seller[]>([]);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const load = async () => {
    if (accessToken) setItems(await salesApi.sellers(accessToken));
  };
  useEffect(() => {
    void load().catch((cause: Error) => setError(cause.message));
  }, [accessToken]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    const data = new FormData(event.currentTarget);
    try {
      const result = await salesApi.create(accessToken, {
        firstName: data.get("firstName"),
        lastName: data.get("lastName"),
        email: data.get("email"),
        phone: data.get("phone") || null,
        commissionType: data.get("commissionType"),
        commissionRate: Number(data.get("commissionRate")),
        commissionDurationMonths: data.get("duration")
          ? Number(data.get("duration"))
          : null,
        commissionHoldDays: Number(data.get("holdDays")),
      });
      setInvite(result.invitationUrl);
      event.currentTarget.reset();
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  return (
    <main className="nx-page">
      <Card
        title="Vendedores"
        subtitle="Invitaciones, códigos y condiciones comerciales."
      >
        {error && <p className="nx-state nx-state--error">{error}</p>}
        {invite && (
          <p className="nx-state nx-state--success">
            Link generado: <a href={invite}>{invite}</a>
          </p>
        )}
        <form className="nx-form" onSubmit={submit}>
          <div className="nx-form-grid">
            <label>
              Nombre
              <input name="firstName" required />
            </label>
            <label>
              Apellido
              <input name="lastName" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Teléfono
              <input name="phone" />
            </label>
            <label>
              Comisión
              <select name="commissionType">
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Fija</option>
              </select>
            </label>
            <label>
              Valor
              <input
                name="commissionRate"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </label>
            <label>
              Duración (meses)
              <input name="duration" type="number" min="1" />
            </label>
            <label>
              Retención (días)
              <input
                name="holdDays"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
            </label>
          </div>
          <button className="nx-btn" type="submit">
            Crear y generar invitación
          </button>
        </form>
      </Card>
      <Card title="Equipo comercial">
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Código</th>
                <th>Estado</th>
                <th>Clientes</th>
                <th>Disponible</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    {item.firstName} {item.lastName}
                    <br />
                    <small>{item.email}</small>
                  </td>
                  <td>
                    <strong>{item.referralCode}</strong>
                  </td>
                  <td>
                    <span className="nx-badge">{item.status}</span>
                  </td>
                  <td>{item.clientCount ?? 0}</td>
                  <td>${item.availableCommission ?? 0}</td>
                  <td>
                    <Link
                      className="nx-btn-secondary"
                      to={`/admin/sellers/${item._id}`}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
