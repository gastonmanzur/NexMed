import type { ReactElement, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const items = [
  ["Inicio", "/seller/dashboard"],
  ["Clientes", "/seller/customers"],
  ["Comisiones", "/seller/commissions"],
  ["Liquidaciones", "/seller/payouts"],
  ["Código comercial", "/seller/referral-link"],
  ["Perfil", "/seller/profile"],
] as const;

export const SellerShell = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearSession } = useAuth();
  return (
    <div className="nx-shell nx-seller-shell">
      <aside className="nx-sidebar">
        <div className="nx-brand">
          <img
            src="/branding/nexmed-sidebar-logo.png"
            alt="NexMed"
            className="nx-brand__logo"
          />
          <p>Panel de vendedor</p>
        </div>
        <nav className="nx-nav" aria-label="Navegación comercial">
          {items.map(([label, to]) => (
            <Link
              key={to}
              to={to}
              className={`nx-nav-link${location.pathname === to ? " is-active" : ""}`}
            >
              <span className="nx-nav-link__dot" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="nx-main">
        <header className="nx-topbar">
          <p className="nx-topbar__title">Panel comercial</p>
          <div className="nx-user">
            <div className="nx-user__meta">
              <div className="nx-user__name">
                {`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
              </div>
              <div className="nx-user__email">{user?.email}</div>
            </div>
            <button
              className="nx-btn-secondary nx-signout-btn"
              type="button"
              onClick={async () => {
                await clearSession();
                navigate("/login", { replace: true });
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
};
