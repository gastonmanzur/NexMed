import type { AuthUserDto } from '@starter/shared-types';
import type { ReactElement, ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth-api';

interface AuthState {
  user: AuthUserDto | null;
  accessToken: string | null;
  loading: boolean;
  setSession: (accessToken: string, user: AuthUserDto) => void;
  clearSession: () => void;
  updateUser: (user: AuthUserDto) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const session = await authApi.refresh();
        setUser(session.user);
        setAccessToken(session.accessToken);
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      loading,
      setSession: (token, profile) => {
        setAccessToken(token);
        setUser(profile);
      },
      clearSession: () => {
        setAccessToken(null);
        setUser(null);
      },
      updateUser: (nextUser) => {
        setUser(nextUser);
      }
    }),
    [accessToken, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
