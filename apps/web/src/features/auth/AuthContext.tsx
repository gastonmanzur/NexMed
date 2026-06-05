import type {
  AuthSessionContextDto,
  AuthUserDto,
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationStatus,
  PatientProfileDto,
} from '@starter/shared-types';
import type { ReactElement, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi } from './auth-api';

const ACTIVE_ORGANIZATION_STORAGE_KEY = 'nexmed.activeOrganizationId';

const resolveSuggestedActiveOrganizationId = (
  context: Pick<AuthSessionContextDto, 'organizations' | 'memberships'>
): string | null => {
  const centerMembershipRoles = new Set(['owner', 'admin', 'staff', 'manager']);
  const activeCenterMemberships = context.memberships.filter(
    (membership) =>
      membership.status === 'active' && centerMembershipRoles.has(membership.role)
  );

  return activeCenterMemberships.length === 1
    ? (activeCenterMemberships[0]?.organizationId ?? null)
    : null;
};

interface AuthState {
  user: AuthUserDto | null;
  accessToken: string | null;
  organizations: OrganizationDto[];
  memberships: OrganizationMembershipDto[];
  patientProfile: PatientProfileDto | null;
  activeOrganizationId: string | null;
  activeOrganizationSummary: OrganizationDto | null;
  onboardingCompleted: boolean;
  organizationStatus: OrganizationStatus | null;
  loading: boolean;
  setSession: (session: { accessToken: string } & AuthSessionContextDto) => void;
  clearSession: () => Promise<void>;
  setActiveOrganizationId: (organizationId: string | null) => void;
  setOrganizationsContext: (payload: {
    organizations: OrganizationDto[];
    memberships: OrganizationMembershipDto[];
    activeOrganizationId?: string | null;
  }) => void;
  refreshOrganizationsContext: () => Promise<void>;
  updateUser: (user: AuthUserDto) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [memberships, setMemberships] = useState<OrganizationMembershipDto[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfileDto | null>(null);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistActiveOrganizationId = useCallback((organizationId: string | null): void => {
    if (organizationId) {
      localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
      return;
    }

    localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  }, []);

  const setActiveOrganizationId = useCallback(
    (organizationId: string | null): void => {
      setActiveOrganizationIdState(organizationId);
      persistActiveOrganizationId(organizationId);
    },
    [persistActiveOrganizationId]
  );

  const applyOrganizationsContext = useCallback(
    (payload: {
      organizations: OrganizationDto[];
      memberships: OrganizationMembershipDto[];
      activeOrganizationId?: string | null;
    }) => {
      setOrganizations(payload.organizations);
      setMemberships(payload.memberships);

      const persistedOrganizationId = localStorage.getItem(
        ACTIVE_ORGANIZATION_STORAGE_KEY
      );

      const suggestedOrganizationId =
        payload.activeOrganizationId ??
        resolveSuggestedActiveOrganizationId({
          organizations: payload.organizations,
          memberships: payload.memberships,
        });

      const nextActiveOrganizationId =
        persistedOrganizationId &&
        payload.organizations.some(
          (organization) => organization.id === persistedOrganizationId
        )
          ? persistedOrganizationId
          : suggestedOrganizationId;

      setActiveOrganizationId(nextActiveOrganizationId ?? null);
    },
    [setActiveOrganizationId]
  );

  useEffect(() => {
    void (async () => {
      try {
        const session = await authApi.refresh();

        setUser(session.user);
        setPatientProfile(session.patientProfile);
        setAccessToken(session.accessToken);
        applyOrganizationsContext({
          organizations: session.organizations,
          memberships: session.memberships,
          activeOrganizationId: session.activeOrganizationId,
        });
      } catch {
        setUser(null);
        setAccessToken(null);
        setOrganizations([]);
        setMemberships([]);
        setPatientProfile(null);
        setActiveOrganizationId(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [applyOrganizationsContext, setActiveOrganizationId]);

  const setSession = useCallback(
    (session: { accessToken: string } & AuthSessionContextDto) => {
      setAccessToken(session.accessToken);
      setUser(session.user);
      setPatientProfile(session.patientProfile);
      applyOrganizationsContext({
        organizations: session.organizations,
        memberships: session.memberships,
        activeOrganizationId: session.activeOrganizationId,
      });
    },
    [applyOrganizationsContext]
  );

  const clearSession = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // noop
    }

    setAccessToken(null);
    setUser(null);
    setOrganizations([]);
    setMemberships([]);
    setPatientProfile(null);
    setActiveOrganizationId(null);
  }, [setActiveOrganizationId]);

  const setOrganizationsContext = useCallback(
    (payload: {
      organizations: OrganizationDto[];
      memberships: OrganizationMembershipDto[];
      activeOrganizationId?: string | null;
    }) => {
      applyOrganizationsContext(payload);
    },
    [applyOrganizationsContext]
  );

  const refreshOrganizationsContext = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      return;
    }

    const context = await authApi.me(accessToken);

    setPatientProfile(context.patientProfile);
    applyOrganizationsContext({
      organizations: context.organizations,
      memberships: context.memberships,
      activeOrganizationId: context.activeOrganizationId,
    });
  }, [accessToken, applyOrganizationsContext]);

  const updateUser = useCallback((nextUser: AuthUserDto) => {
    setUser(nextUser);
  }, []);

  const activeOrganizationSummary = useMemo(
    () =>
      organizations.find((organization) => organization.id === activeOrganizationId) ??
      null,
    [activeOrganizationId, organizations]
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      organizations,
      memberships,
      patientProfile,
      activeOrganizationId,
      activeOrganizationSummary,
      onboardingCompleted: activeOrganizationSummary?.onboardingCompleted ?? false,
      organizationStatus: activeOrganizationSummary?.status ?? null,
      loading,
      setSession,
      clearSession,
      setActiveOrganizationId,
      setOrganizationsContext,
      refreshOrganizationsContext,
      updateUser,
    }),
    [
      user,
      accessToken,
      organizations,
      memberships,
      patientProfile,
      activeOrganizationId,
      activeOrganizationSummary,
      loading,
      setSession,
      clearSession,
      setActiveOrganizationId,
      setOrganizationsContext,
      refreshOrganizationsContext,
      updateUser,
    ]
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