import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe } from "../api/clinic";
import { Clinic } from "../types";

const TOKEN_KEY = "turnos_token";

type AuthContextValue = {
  token: string | null;
  clinic: Clinic | null;
  loading: boolean;
  setSession: (token: string, clinic: Clinic) => void;
  logout: () => void;
  refreshClinic: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshClinic = async () => {
    if (!token) {
      setClinic(null);
      return;
    }
    const data = await getMe(token);
    setClinic(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshClinic();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setClinic(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      clinic,
      loading,
      setSession: (nextToken, nextClinic) => {
        localStorage.setItem(TOKEN_KEY, nextToken);
        setToken(nextToken);
        setClinic(nextClinic);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setClinic(null);
      },
      refreshClinic,
    }),
    [token, clinic, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
