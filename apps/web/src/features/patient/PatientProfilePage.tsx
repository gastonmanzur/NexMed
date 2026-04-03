import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../auth/auth-api';
import { patientApi } from './patient-api';
import { resolveAvatarUrl } from '../../lib/resolve-avatar-url';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const initialsFor = (firstName?: string, lastName?: string, email?: string): string => {
  const fullInitials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase();
  if (fullInitials) {
    return fullInitials;
  }
  return (email?.[0] ?? 'U').toUpperCase();
};

export const PatientProfilePage = (): ReactElement => {
  const { user, accessToken, updateUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    void patientApi
      .getMe(accessToken)
      .then((me) => {
        setPhone(me.patientProfile.phone ?? '');
        setDateOfBirth(me.patientProfile.dateOfBirth ?? '');
        setDocumentId(me.patientProfile.documentId ?? '');
      })
      .catch((cause) => setError((cause as Error).message));
  }, [accessToken]);

  return (
    <main className="nx-page" style={{ maxWidth: 760 }}>
      <Card title="Mi imagen de perfil" subtitle="Administrá tu avatar personal.">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          {user?.avatar?.url ? (
            <img src={resolveAvatarUrl(user.avatar.url)} alt="Avatar de usuario" className="nx-avatar" />
          ) : (
            <span className="nx-avatar nx-avatar--fallback">
              {initialsFor(user?.firstName, user?.lastName, user?.email)}
            </span>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {user?.provider === 'google' ? 'Cuenta Google' : 'Cuenta local'}
            </p>
            {user?.provider === 'google' ? (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
                Tu imagen de perfil se gestiona desde Google.
              </p>
            ) : (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
                Formatos permitidos: JPG, PNG o WEBP. Máximo 2MB.
              </p>
            )}
          </div>
        </div>

        {avatarError ? <p style={{ color: 'var(--danger)' }}>{avatarError}</p> : null}

        {user?.provider === 'local' ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label className="nx-btn-secondary" style={{ cursor: avatarBusy ? 'not-allowed' : 'pointer' }}>
              {avatarBusy ? 'Procesando...' : user?.avatar ? 'Cambiar imagen' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={avatarBusy}
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  if (!file || !accessToken || !user) {
                    return;
                  }

                  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                    setAvatarError('Tipo de archivo inválido. Usá JPG, PNG o WEBP.');
                    return;
                  }

                  if (file.size > MAX_IMAGE_SIZE_BYTES) {
                    setAvatarError('La imagen excede el tamaño máximo de 2MB.');
                    return;
                  }

                  void (async () => {
                    try {
                      setAvatarBusy(true);
                      setAvatarError('');
                      const avatar = await authApi.uploadMyAvatar(accessToken, file);
                      updateUser({ ...user, avatar });
                    } catch (cause) {
                      setAvatarError((cause as Error).message);
                    } finally {
                      setAvatarBusy(false);
                    }
                  })();
                }}
              />
            </label>

            {user?.avatar ? (
              <button
                type="button"
                className="nx-btn-danger"
                disabled={avatarBusy}
                onClick={() => {
                  if (!accessToken || !user) {
                    return;
                  }

                  void (async () => {
                    try {
                      setAvatarBusy(true);
                      setAvatarError('');
                      await authApi.deleteMyAvatar(accessToken);
                      updateUser({ ...user, avatar: null });
                    } catch (cause) {
                      setAvatarError((cause as Error).message);
                    } finally {
                      setAvatarBusy(false);
                    }
                  })();
                }}
              >
                Quitar imagen
              </button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card title="Mi perfil de paciente" subtitle="Mantené tus datos personales actualizados para una mejor atención.">
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {message ? <p style={{ color: '#166534' }}>{message}</p> : null}
        <form className="nx-form-grid" onSubmit={(event) => event.preventDefault()}>
          <label className="nx-field">
            Teléfono
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="nx-field">
            Fecha de nacimiento
            <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
          </label>
          <label className="nx-field">
            Documento
            <input value={documentId} onChange={(event) => setDocumentId(event.target.value)} />
          </label>
          <div>
            <button
              type="button"
              className="nx-btn"
              onClick={async () => {
                if (!accessToken) return;
                try {
                  setError('');
                  await patientApi.patchMe(accessToken, { phone, dateOfBirth, documentId });
                  setMessage('Perfil actualizado.');
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}
            >
              Guardar
            </button>
          </div>
        </form>
      </Card>
    </main>
  );
};
