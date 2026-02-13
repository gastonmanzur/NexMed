import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe } from "../api/auth";
import { AuthProfile, AuthUser, Clinic } from "../types";

const TOKEN_KEY = "turnos_token";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  clinic: Clinic | null;
  loading: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!token) {
      setProfile(null);
      return;
    }
    const data = await getMe(token);
    setProfile(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshProfile();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const user = useMemo<AuthUser | null>(() => {
    if (!profile) return null;
    const id = String((profile as any)._id ?? (profile as any).id ?? "");
    return {
      id,
      type: profile.type,
      email: profile.email,
      displayName: profile.type === "clinic" ? profile.name : `${profile.firstName} ${profile.lastName}`.trim(),
    };
  }, [profile]);

  const clinic = profile?.type === "clinic" ? profile : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      clinic,
      loading,
      setSession: (nextToken) => {
        localStorage.setItem(TOKEN_KEY, nextToken);
        setToken(nextToken);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setProfile(null);
      },
      refreshProfile,
    }),
    [token, user, clinic, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
