import type { ReactElement, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './professional.css';

export const ProfessionalShell = ({ children }: { children: ReactNode }): ReactElement => {
  const { activeOrganizationSummary, user } = useAuth();

  return (
    <div className="professional-shell">
      <aside className="professional-sidebar">
        <div className="professional-brand">
          <span className="professional-brand__mark">N</span>
          <div>
            <strong>NexMed Pro</strong>
            <small>{activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Centro actual'}</small>
          </div>
        </div>
        <nav className="professional-nav" aria-label="Panel profesional">
          <NavLink to="/app/professional">Inicio</NavLink>
          <NavLink to="/app/professional/waiting-room">Sala de espera</NavLink>
          <NavLink to="/app/professional/appointments">Agenda del día</NavLink>
          <span>Atención actual</span>
          <span>Pacientes</span>
          <span>Historia clínica</span>
          <span>Recetas / Indicaciones</span>
          <span>Mensajes</span>
          <span>Perfil</span>
        </nav>
      </aside>
      <main className="professional-main">
        <header className="professional-topbar">
          <div>
            <span>Centro actual</span>
            <strong>{activeOrganizationSummary?.displayName ?? activeOrganizationSummary?.name ?? 'Sin centro seleccionado'}</strong>
          </div>
          <div>
            <span>Profesional</span>
            <strong>{user ? `${user.firstName} ${user.lastName}` : 'Profesional'}</strong>
          </div>
          <div>
            <span>Fecha</span>
            <strong>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(new Date())}</strong>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};
