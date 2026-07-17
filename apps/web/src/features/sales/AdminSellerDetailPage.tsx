import { type ReactElement, useEffect, useState } from "react";
import { Card } from "@starter/ui";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { salesApi, type SellerDetail } from "./sales-api";

export const AdminSellerDetailPage = (): ReactElement => {
  const { sellerId = "" } = useParams();
  const { accessToken } = useAuth();
  const [data, setData] = useState<SellerDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (accessToken)
      void salesApi
        .detail(accessToken, sellerId)
        .then(setData)
        .catch((e: Error) => setError(e.message));
  }, [accessToken, sellerId]);
  return (
    <main className="nx-page">
      <Card
        title={
          data
            ? `${data.seller.firstName} ${data.seller.lastName}`
            : "Detalle del vendedor"
        }
        subtitle={
          data
            ? `${data.seller.email} · ${data.seller.referralCode}`
            : "Clientes, suscripciones y comisiones"
        }
      >
        {error && <p className="nx-state nx-state--error">{error}</p>}
        {data && (
          <div className="nx-kpis">
            <div className="nx-kpi">
              <span>Estado</span>
              <p>{data.seller.status}</p>
            </div>
            <div className="nx-kpi">
              <span>Clientes</span>
              <p>{data.clients.length}</p>
            </div>
            <div className="nx-kpi">
              <span>Comisiones</span>
              <p>{data.commissions.length}</p>
            </div>
            <div className="nx-kpi">
              <span>Liquidaciones</span>
              <p>{data.settlements.length}</p>
            </div>
          </div>
        )}
      </Card>
      <Card title="Clientes y suscripciones">
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Organización</th>
                <th>Estado comercial</th>
                <th>Asociado</th>
              </tr>
            </thead>
            <tbody>
              {data?.clients.map((c) => (
                <tr key={c._id}>
                  <td>{c.organizationId.name}</td>
                  <td>{c.status}</td>
                  <td>
                    {new Date(c.attributedAt).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
    </main>
  );
};
