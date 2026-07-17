import { type ReactElement, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { salesApi } from "./sales-api";

export const SellerProtectedRoute = ({
  children,
}: {
  children: ReactElement;
}): ReactElement => {
  const { user, loading, accessToken } = useAuth();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;
    if (!user || !accessToken) return;
    setStatus("checking");
    void salesApi.dashboard(accessToken).then(
      () => !cancelled && setStatus("allowed"),
      () => !cancelled && setStatus("denied"),
    );
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  if (loading || status === "checking")
    return <p>Cargando panel comercial...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (status === "denied") return <Navigate to="/post-login" replace />;
  return children;
};
