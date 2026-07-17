import { type ReactElement, useEffect, useState } from "react";
import { Card } from "@starter/ui";
import { useAuth } from "../auth/AuthContext";
import { salesApi, type SellerDetail } from "./sales-api";

type SellerSection =
  | "dashboard"
  | "customers"
  | "commissions"
  | "payouts"
  | "referral"
  | "profile";

export const SellerDashboardPage = ({
  section = "dashboard",
}: {
  section?: SellerSection;
}): ReactElement => {
  const { accessToken } = useAuth();
  const [data, setData] = useState<SellerDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (accessToken)
      void salesApi
        .dashboard(accessToken)
        .then(setData)
        .catch((cause: Error) => setError(cause.message));
  }, [accessToken]);
  const showDashboard = section === "dashboard";
  return (
    <main className="nx-page">
      {(showDashboard || section === "referral" || section === "profile") && (
        <Card
          title="Panel comercial"
          subtitle={
            data
              ? `${data.seller.firstName} · Código ${data.seller.referralCode}`
              : "Tus referidos y comisiones"
          }
        >
          {error && <p className="nx-state nx-state--error">{error}</p>}
          {data && showDashboard && (
            <div className="nx-kpis">
              <div className="nx-kpi">
                <span>Clientes</span>
                <p>{data.clients.length}</p>
              </div>
              <div className="nx-kpi">
                <span>Comisiones disponibles</span>
                <p>
                  $
                  {data.commissions
                    .filter((c) => c.status === "available")
                    .reduce((sum, c) => sum + c.amount, 0)}
                </p>
              </div>
              <div className="nx-kpi">
                <span>Liquidadas</span>
                <p>
                  $
                  {data.settlements
                    .filter((s) => s.status === "paid")
                    .reduce((sum, s) => sum + s.amount, 0)}
                </p>
              </div>
              <div className="nx-kpi">
                <span>Dejaron de pagar</span>
                <p>{data.clients.filter((c) => c.status === "lost").length}</p>
              </div>
            </div>
          )}
          {data && section === "referral" ? (
            <div>
              <p>Tu código comercial</p>
              <h2>{data.seller.referralCode}</h2>
              <p>Compartilo con tus clientes para asociarlos a tu cuenta.</p>
            </div>
          ) : null}
          {data && section === "profile" ? (
            <div>
              <p>
                <strong>
                  {data.seller.firstName} {data.seller.lastName}
                </strong>
              </p>
              <p>{data.seller.email}</p>
              <p>{data.seller.phone ?? "Sin teléfono informado"}</p>
            </div>
          ) : null}
        </Card>
      )}
      {(showDashboard || section === "customers") && (
        <Card title="Clientes asociados">
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Alta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data?.clients.map((c) => (
                  <tr key={c._id}>
                    <td>{c.organizationId.name}</td>
                    <td>
                      {new Date(c.attributedAt).toLocaleDateString("es-AR")}
                    </td>
                    <td>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {(showDashboard || section === "commissions") && (
        <Card title="Comisiones">
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data?.commissions.map((c) => (
                  <tr key={c._id}>
                    <td>{new Date(c.createdAt).toLocaleDateString("es-AR")}</td>
                    <td>
                      {c.currency} {c.amount}
                    </td>
                    <td>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {section === "payouts" && (
        <Card title="Liquidaciones">
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data?.settlements.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {new Date(
                        item.paidAt ?? item.createdAt,
                      ).toLocaleDateString("es-AR")}
                    </td>
                    <td>
                      {item.currency} {item.amount}
                    </td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
};
