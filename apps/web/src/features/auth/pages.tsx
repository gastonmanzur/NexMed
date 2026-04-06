import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { getFirebaseAuth } from '../../lib/firebase-client';
import { authApi } from './auth-api';
import { useAuth } from './AuthContext';
import { clearJoinIntent, readJoinIntent } from '../patient/join-intent';
import { patientApi } from '../patient/patient-api';

const viewStyle = { maxWidth: 560, margin: '2rem auto', padding: '1rem' };
const authSurfaceStyle = { maxWidth: 480 };

const getGoogleLoginErrorMessage = (cause: unknown): string => {
  const error = cause as FirebaseError;

  switch (error.code) {
    case 'auth/account-exists-with-different-credential':
      return 'Esta cuenta ya existe con otro método de autenticación.';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google antes de completar el login.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó el popup de Google. Habilítalo e inténtalo de nuevo.';
    case 'auth/cancelled-popup-request':
      return 'Ya hay una solicitud de login en curso.';
    default:
      return (cause as Error).message;
  }
};

const useGoogleLogin = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  return async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, provider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;

    if (!idToken) {
      throw new Error('No se pudo obtener el Google ID token');
    }

    const session = await authApi.loginGoogle({
      idToken,
      photoURL: result.user.photoURL,
    });

    setSession(session);
    navigate('/post-login');
  };
};

const AuthLayout = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}): ReactElement => (
  <main className="nx-auth-page" style={viewStyle}>
    <section className="nx-auth-shell" style={authSurfaceStyle}>
      <header className="nx-auth-header">
        <p className="nx-auth-kicker">NexMed</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </section>
  </main>
);

export const RegisterPage = (): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const loginWithGoogle = useGoogleLogin();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle="Creá tu cuenta para gestionar centros, pacientes y turnos desde un único lugar."
    >
      <Card title="Datos de acceso">
        <div className="nx-form-grid">
          <label className="nx-field">
            <span>Nombre</span>
            <input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="nx-field">
            <span>Apellido</span>
            <input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="nx-field">
            <span>Email</span>
            <input placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="nx-field">
            <span>Contraseña</span>
            <input placeholder="Mínimo 8 caracteres" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="nx-field">
            <span>Confirmar contraseña</span>
            <input placeholder="Repetí tu contraseña" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
        </div>

        <div className="nx-auth-actions">
          <button
            type="button"
            className="nx-btn"
            disabled={loading}
            onClick={async () => {
              try {
                setError('');
                setLoading(true);

                if (password !== confirmPassword) {
                  throw new Error('Las contraseñas no coinciden');
                }

                const session = await authApi.register({
                  firstName,
                  lastName,
                  email,
                  password,
                });

                setSession(session);
                navigate('/post-login');
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Creando cuenta...' : t('auth.register.submit')}
          </button>

          <button
            type="button"
            className="nx-btn-secondary nx-btn-google"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                await loginWithGoogle();
              } catch (cause) {
                setError(getGoogleLoginErrorMessage(cause));
              } finally {
                setLoading(false);
              }
            }}
          >
            {t('auth.login.google')}
          </button>
        </div>

        {error ? <p className="nx-auth-message nx-auth-message--error">{error}</p> : null}
        <p className="nx-auth-footer-link">
          <Link to="/login">{t('auth.common.goLogin')}</Link>
        </p>
      </Card>
    </AuthLayout>
  );
};

export const LoginPage = (): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const loginWithGoogle = useGoogleLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle="Bienvenido de nuevo. Accedé a NexMed para gestionar tu operación diaria."
    >
      <Card title="Ingresá con tu cuenta">
        <div className="nx-form-grid">
          <label className="nx-field">
            <span>Email</span>
            <input placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="nx-field">
            <span>Contraseña</span>
            <input placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </div>

        <div className="nx-auth-actions">
          <button
            type="button"
            className="nx-btn"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                const session = await authApi.login(email, password);
                setSession(session);
                navigate('/post-login');
              } catch (cause) {
                setError((cause as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Ingresando...' : t('auth.login.submit')}
          </button>

          <button
            type="button"
            className="nx-btn-secondary nx-btn-google"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                await loginWithGoogle();
              } catch (cause) {
                setError(getGoogleLoginErrorMessage(cause));
              } finally {
                setLoading(false);
              }
            }}
          >
            {t('auth.login.google')}
          </button>
        </div>

        {error ? <p className="nx-auth-message nx-auth-message--error">{error}</p> : null}

        <div className="nx-auth-links">
          <Link to="/register">Crear cuenta</Link>
          <Link to="/forgot-password">{t('auth.login.forgot')}</Link>
        </div>
      </Card>
    </AuthLayout>
  );
};

export const PostLoginResolverPage = (): ReactElement => {
  const {
    loading,
    user,
    organizations,
    memberships,
    activeOrganizationId,
    accessToken,
  } = useAuth();

  const [bootstrapResolved, setBootstrapResolved] = useState(false);
  const [hasPatientOrganizations, setHasPatientOrganizations] = useState(false);
  const [joinResolutionFailed, setJoinResolutionFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      if (!user || !accessToken) {
        if (!cancelled) {
          setBootstrapResolved(true);
          setHasPatientOrganizations(false);
          setJoinResolutionFailed(false);
        }
        return;
      }

      if (!cancelled) {
        setBootstrapResolved(false);
        setHasPatientOrganizations(false);
        setJoinResolutionFailed(false);
      }

      const pendingJoin = readJoinIntent();

      let joinResolved = !pendingJoin;
      let patientOrganizationsDetected = false;

      try {
        if (pendingJoin) {
          await patientApi.resolveJoin(accessToken, pendingJoin);
          joinResolved = true;
        }
      } catch {
        joinResolved = false;
      }

      try {
        const patientMe = await patientApi.getMe(accessToken);
        patientOrganizationsDetected = (patientMe.organizations?.length ?? 0) > 0;
      } catch {
        patientOrganizationsDetected = false;
      }

      if (!cancelled) {
        setHasPatientOrganizations(patientOrganizationsDetected);
        setJoinResolutionFailed(
          Boolean(pendingJoin) && !joinResolved && !patientOrganizationsDetected
        );
        setBootstrapResolved(true);
      }

      if (!pendingJoin || joinResolved || patientOrganizationsDetected) {
        clearJoinIntent();
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  if (loading && !bootstrapResolved) {
    return <p>Cargando...</p>;
  }

  if (!bootstrapResolved) {
    return <p>Resolviendo vinculación pendiente...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (joinResolutionFailed) {
    return (
      <p>
        No pudimos completar tu vinculación al centro. Reintentá desde el enlace
        de invitación.
      </p>
    );
  }

  const resolvedOrganizationId = activeOrganizationId ?? organizations[0]?.id ?? null;

  const activeOrganization = organizations.find(
    (organization) => organization.id === resolvedOrganizationId
  );

  const activeMembership = memberships.find(
    (membership) =>
      membership.organizationId === resolvedOrganizationId &&
      membership.status === 'active'
  );

  const shouldGoToPatient =
    activeMembership?.role === 'patient' ||
    (organizations.length === 0 && hasPatientOrganizations);

  if (shouldGoToPatient) {
    return <Navigate to="/patient/organizations" replace />;
  }

  if (organizations.length === 0 && !hasPatientOrganizations) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!activeOrganizationId && organizations.length > 1) {
    return <Navigate to="/select-organization" replace />;
  }

  if (
    !activeOrganization?.onboardingCompleted ||
    activeOrganization.status === 'onboarding'
  ) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  return <Navigate to="/app" replace />;
};

export const VerifyEmailPage = (): ReactElement => {
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');

  return (
    <AuthLayout title={t('auth.verify.title')} subtitle="Confirmá tu email para activar tu cuenta y continuar.">
      <Card title="Validación de email">
        <button
          className="nx-btn"
          type="button"
          onClick={async () => {
            const token = params.get('token') ?? '';
            await authApi.verifyEmail(token);
            setStatus('ok');
          }}
        >
          {t('auth.verify.submit')}
        </button>
        {status === 'ok' ? <p className="nx-auth-message nx-auth-message--success">{t('auth.verify.success')}</p> : null}
      </Card>
    </AuthLayout>
  );
};

export const ForgotPasswordPage = (): ReactElement => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle="Te enviaremos un enlace para crear una nueva contraseña.">
      <Card title="Recuperar acceso">
        <label className="nx-field">
          <span>Email</span>
          <input placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button
          className="nx-btn"
          type="button"
          onClick={async () => {
            await authApi.forgotPassword(email);
            setMessage(t('auth.forgot.success'));
          }}
        >
          {t('auth.forgot.submit')}
        </button>
        {message ? <p className="nx-auth-message nx-auth-message--success">{message}</p> : null}
      </Card>
    </AuthLayout>
  );
};

export const ResetPasswordPage = (): ReactElement => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  return (
    <AuthLayout title={t('auth.reset.title')} subtitle="Elegí una nueva contraseña segura para tu cuenta.">
      <Card title="Nueva contraseña">
        <label className="nx-field">
          <span>Nueva contraseña</span>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <button
          className="nx-btn"
          type="button"
          onClick={async () => {
            await authApi.resetPassword(params.get('token') ?? '', newPassword);
            setMessage(t('auth.reset.success'));
          }}
        >
          {t('auth.reset.submit')}
        </button>
        {message ? <p className="nx-auth-message nx-auth-message--success">{message}</p> : null}
      </Card>
    </AuthLayout>
  );
};

export const ChangePasswordPage = (): ReactElement => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  return (
    <AuthLayout title={t('auth.change.title')} subtitle="Actualizá tu contraseña y mantené tu cuenta protegida.">
      <Card title="Seguridad de cuenta">
        <label className="nx-field">
          <span>{t('auth.change.current')}</span>
          <input
            type="password"
            placeholder={t('auth.change.current')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="nx-field">
          <span>{t('auth.change.new')}</span>
          <input
            type="password"
            placeholder={t('auth.change.new')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <button
          className="nx-btn"
          type="button"
          onClick={async () => {
            if (!accessToken) return;
            await authApi.changePassword(accessToken, currentPassword, newPassword);
            setMessage(t('auth.change.success'));
          }}
        >
          {t('auth.change.submit')}
        </button>
        {message ? <p className="nx-auth-message nx-auth-message--success">{message}</p> : null}
      </Card>
    </AuthLayout>
  );
};
