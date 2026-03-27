import type { ReactElement } from 'react';
import { useState } from 'react';
import type { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { getFirebaseAuth } from '../../lib/firebase-client';
import { authApi } from './auth-api';
import { useAuth } from './AuthContext';

const viewStyle = { maxWidth: 560, margin: '2rem auto', padding: '1rem' };

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

export const RegisterPage = (): ReactElement => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  return (
    <main style={viewStyle}>
      <Card title={t('auth.register.title')}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            await authApi.register(email, password);
            setMessage(t('auth.register.success'));
          }}
        >
          {t('auth.register.submit')}
        </button>
        <p>{message}</p>
        <Link to="/login">{t('auth.common.goLogin')}</Link>
      </Card>
    </main>
  );
};

export const LoginPage = (): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <main style={viewStyle}>
      <Card title={t('auth.login.title')}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            try {
              const session = await authApi.login(email, password);
              setSession(session.accessToken, session.user);
              navigate('/dashboard');
            } catch (cause) {
              setError((cause as Error).message);
            }
          }}
        >
          {t('auth.login.submit')}
        </button>
       <button
  type="button"
  onClick={async () => {
    
    try {
      const provider = new GoogleAuthProvider();
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, provider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;

      console.log('GOOGLE CREDENTIAL =>', credential);
console.log('GOOGLE USER =>', result.user);
console.log('GOOGLE PHOTO URL =>', result.user.photoURL);

      if (!idToken) {
        throw new Error('No se pudo obtener el Google ID token');
      }

      const session = await authApi.loginGoogle({ idToken, photoURL: result.user.photoURL });
      setSession(session.accessToken, session.user);
      navigate('/dashboard');
    } catch (cause) {
      setError(getGoogleLoginErrorMessage(cause));
    }
    
  }}
  
  >
  
  {t('auth.login.google')}
</button>
        <p>{error}</p>
        <Link to="/forgot-password">{t('auth.login.forgot')}</Link>
      </Card>
    </main>
  );
};

export const VerifyEmailPage = (): ReactElement => {
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');

  return (
    <main style={viewStyle}>
      <Card title={t('auth.verify.title')}>
        <button
          type="button"
          onClick={async () => {
            const token = params.get('token') ?? '';
            await authApi.verifyEmail(token);
            setStatus('ok');
          }}
        >
          {t('auth.verify.submit')}
        </button>
        {status === 'ok' ? <p>{t('auth.verify.success')}</p> : null}
      </Card>
    </main>
  );
};

export const ForgotPasswordPage = (): ReactElement => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  return (
    <main style={viewStyle}>
      <Card title={t('auth.forgot.title')}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            await authApi.forgotPassword(email);
            setMessage(t('auth.forgot.success'));
          }}
        >
          {t('auth.forgot.submit')}
        </button>
        <p>{message}</p>
      </Card>
    </main>
  );
};

export const ResetPasswordPage = (): ReactElement => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  return (
    <main style={viewStyle}>
      <Card title={t('auth.reset.title')}>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            await authApi.resetPassword(params.get('token') ?? '', newPassword);
            setMessage(t('auth.reset.success'));
          }}
        >
          {t('auth.reset.submit')}
        </button>
        <p>{message}</p>
      </Card>
    </main>
  );
};

export const ChangePasswordPage = (): ReactElement => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  return (
    <main style={viewStyle}>
      <Card title={t('auth.change.title')}>
        <input type="password" placeholder={t('auth.change.current')} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <input type="password" placeholder={t('auth.change.new')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            if (!accessToken) return;
            await authApi.changePassword(accessToken, currentPassword, newPassword);
            setMessage(t('auth.change.success'));
          }}
        >
          {t('auth.change.submit')}
        </button>
        <p>{message}</p>
      </Card>
    </main>
  );
};
