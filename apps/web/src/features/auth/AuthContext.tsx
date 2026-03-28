import type { AuthSessionContextDto, AuthUserDto, OrganizationDto, OrganizationMembershipDto, OrganizationStatus } from '@starter/shared-types';
import type { ReactElement, ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth-api';

const ACTIVE_ORGANIZATION_STORAGE_KEY = 'nexmed.activeOrganizationId';

const resolveSuggestedActiveOrganizationId = (context: Pick<AuthSessionContextDto, 'organizations' | 'memberships'>): string | null => {
  const activeMemberships = context.memberships.filter((membership) => membership.status === 'active');
  return activeMemberships.length === 1 ? (activeMemberships[0]?.organizationId ?? null) : null;
};

interface AuthState {
  user: AuthUserDto | null;
  accessToken: string | null;
  organizations: OrganizationDto[];
  memberships: OrganizationMembershipDto[];
  activeOrganizationId: string | null;
  activeOrganizationSummary: OrganizationDto | null;
  onboardingCompleted: boolean;
  organizationStatus: OrganizationStatus | null;
  loading: boolean;
  setSession: (session: { accessToken: string } & AuthSessionContextDto) => void;
  clearSession: () => Promise<void>;
  setActiveOrganizationId: (organizationId: string | null) => void;
  setOrganizationsContext: (payload: { organizations: OrganizationDto[]; memberships: OrganizationMembershipDto[]; activeOrganizationId?: string | null }) => void;
  refreshOrganizationsContext: () => Promise<void>;
  updateUser: (user: AuthUserDto) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [memberships, setMemberships] = useState<OrganizationMembershipDto[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistActiveOrganizationId = (organizationId: string | null): void => {
    if (organizationId) {
      localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
      return;
    }

    localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  };

  const setActiveOrganizationId = (organizationId: string | null): void => {
    setActiveOrganizationIdState(organizationId);
    persistActiveOrganizationId(organizationId);
  };

  useEffect(() => {
    void (async () => {
      try {
        const session = await authApi.refresh();
        const persistedOrganizationId = localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
        const suggestedOrganizationId =
          session.activeOrganizationId ??
          resolveSuggestedActiveOrganizationId({ organizations: session.organizations, memberships: session.memberships });

        const nextActiveOrganizationId =
          persistedOrganizationId && session.organizations.some((organization) => organization.id === persistedOrganizationId)
            ? persistedOrganizationId
            : suggestedOrganizationId;

        setUser(session.user);
        setAccessToken(session.accessToken);
        setOrganizations(session.organizations);
        setMemberships(session.memberships);
        setActiveOrganizationId(nextActiveOrganizationId ?? null);
      } catch {
        setUser(null);
        setAccessToken(null);
        setOrganizations([]);
        setMemberships([]);
        setActiveOrganizationId(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeOrganizationSummary = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [activeOrganizationId, organizations]
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      organizations,
      memberships,
      activeOrganizationId,
      activeOrganizationSummary,
      onboardingCompleted: activeOrganizationSummary?.onboardingCompleted ?? false,
      organizationStatus: activeOrganizationSummary?.status ?? null,
      loading,
      setSession: (session) => {
        setAccessToken(session.accessToken);
        setUser(session.user);
        setOrganizations(session.organizations);
        setMemberships(session.memberships);

        const nextActiveOrganizationId =
          session.activeOrganizationId ?? resolveSuggestedActiveOrganizationId(session);

        setActiveOrganizationId(nextActiveOrganizationId);
      },
      clearSession: async () => {
        try {
          await authApi.logout();
        } catch {
          // noop
        }

        setAccessToken(null);
        setUser(null);
        setOrganizations([]);
        setMemberships([]);
        setActiveOrganizationId(null);
      },
      setActiveOrganizationId,
      setOrganizationsContext: (payload) => {
        setOrganizations(payload.organizations);
        setMemberships(payload.memberships);

        const nextActiveOrganizationId =
          payload.activeOrganizationId ?? resolveSuggestedActiveOrganizationId(payload);

        setActiveOrganizationId(nextActiveOrganizationId);
      },
      refreshOrganizationsContext: async () => {
        if (!accessToken) {
          return;
        }

        const context = await authApi.me(accessToken);
        setOrganizations(context.organizations);
        setMemberships(context.memberships);

        const persistedOrganizationId = localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
        const suggestedOrganizationId =
          context.activeOrganizationId ??
          resolveSuggestedActiveOrganizationId({ organizations: context.organizations, memberships: context.memberships });

        const nextActiveOrganizationId =
          persistedOrganizationId && context.organizations.some((organization) => organization.id === persistedOrganizationId)
            ? persistedOrganizationId
            : suggestedOrganizationId;

        setActiveOrganizationId(nextActiveOrganizationId ?? null);
      },
      updateUser: (nextUser) => {
        setUser(nextUser);
      }
    }),
    [accessToken, activeOrganizationId, activeOrganizationSummary, loading, memberships, organizations, user]
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
