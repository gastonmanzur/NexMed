import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useAuth } from '../auth/AuthContext';
import { professionalApi } from './professional-api';

export const ProfessionalProfilePage = (): ReactElement => {
  const { accessToken, activeOrganizationId, activeOrganizationSummary, memberships, user } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) return;
    void (async () => {
      setLoading(true);
      try { setMe(await professionalApi.me(accessToken, activeOrganizationId)); setError(null); }
      catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil profesional'); }
      finally { setLoading(false); }
    })();
  }, [accessToken, activeOrganizationId]);

  const membership = useMemo(() => memberships.find((item) => item.organizationId === activeOrganizationId), [memberships, activeOrganizationId]);
  const professional = me?.professional;
  const fullName = professional?.displayName ?? ([professional?.firstName ?? user?.firstName, professional?.lastName ?? user?.lastName].filter(Boolean).join(' ') || 'Profesional');
  const specialties = professional?.specialties?.map((specialty: { name?: string }) => specialty.name).filter(Boolean).join(', ') || professional?.specialtyName || 'Sin especialidades cargadas';

  if (loading) return <LoadingState message="Cargando perfil profesional..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="professional-dashboard">
      <div className="pro-hero"><div><span>Perfil</span><h1>Perfil profesional</h1><p>Datos básicos de acceso al panel profesional.</p></div><div className="pro-hero__status">{membership?.status ?? 'activo'}</div></div>
      <section className="pro-panel">
        <header className="pro-section-header"><div><span>Datos básicos</span><h2>{fullName}</h2></div></header>
        <div className="attention-facts">
          <p><b>Nombre</b><span>{fullName}</span></p>
          <p><b>Email</b><span>{professional?.email ?? user?.email ?? 'Sin email cargado'}</span></p>
          <p><b>Centro</b><span>{activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? me?.organizationName ?? 'Centro actual'}</span></p>
          <p><b>Especialidades</b><span>{specialties}</span></p>
          <p><b>Estado de acceso</b><span>{membership?.status ?? 'Activo'}</span></p>
        </div>
      </section>
    </section>
  );
};
