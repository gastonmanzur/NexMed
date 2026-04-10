import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

const APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, '');

export const OrganizationInvitePage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{
    inviteUrl: string;
    token: string;
    qrValue: string;
    updatedAt: string;
  } | null>(null);

  const absoluteLink = useMemo(() => {
    if (!data?.inviteUrl) return '';
    return data.inviteUrl.startsWith('http') ? data.inviteUrl : `${APP_URL}${data.inviteUrl}`;
  }, [data?.inviteUrl]);

  const qrUrl = useMemo(() => {
    if (!absoluteLink) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(absoluteLink)}`;
  }, [absoluteLink]);

  const loadInvite = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    setError('');
    try {
      const response = await organizationApi.getInviteLink(accessToken, activeOrganizationId);
      setData({
        inviteUrl: response.inviteUrl,
        token: response.token,
        qrValue: response.qrValue,
        updatedAt: response.updatedAt
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeOrganizationId]);

  const onCopy = async (): Promise<void> => {
    if (!absoluteLink) return;
    await navigator.clipboard.writeText(absoluteLink);
  };

  const onRegenerate = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setRegenerating(true);
    setError('');
    try {
      const response = await organizationApi.regenerateInviteLink(accessToken, activeOrganizationId);
      setData({
        inviteUrl: response.inviteUrl,
        token: response.token,
        qrValue: response.qrValue,
        updatedAt: response.updatedAt
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <main style={{ maxWidth: 920, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Invitación para pacientes">
        <section className="nx-invite">
          <p className="nx-invite__lead">Compartí este link o QR para que los pacientes se vinculen al centro y puedan reservar turnos.</p>
          {loading ? <p className="nx-invite__meta">Cargando link de invitación...</p> : null}
          {error ? <p className="nx-invite__error">{error}</p> : null}

          {data ? (
            <>
              <div className="nx-invite__block">
                <p className="nx-invite__label"><strong>Link de invitación</strong></p>
                <code className="nx-invite__code">{absoluteLink}</code>
              </div>
              <div className="nx-invite__meta-group">
                <p className="nx-invite__meta"><strong>Token:</strong> {data.token}</p>
                <p className="nx-invite__meta"><strong>Actualizado:</strong> {new Date(data.updatedAt).toLocaleString('es-AR', { hour12: false })}</p>
              </div>
              <div className="nx-invite__actions">
                <button type="button" className="nx-btn" onClick={() => void onCopy()}>Copiar link</button>
                <button type="button" className="nx-btn-secondary" onClick={() => void onRegenerate()} disabled={regenerating}>{regenerating ? 'Regenerando...' : 'Regenerar link'}</button>
              </div>
              {qrUrl ? (
                <div className="nx-invite__qr">
                  <img src={qrUrl} alt="QR invitación" width={220} height={220} />
                  <p className="nx-invite__meta">
                    <a href={qrUrl} download="nexmed-invite-qr.png">Descargar QR</a>
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </Card>
    </main>
  );
};
