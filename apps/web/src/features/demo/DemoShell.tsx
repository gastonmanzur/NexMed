import type { ReactElement } from 'react';
import { demoData } from './demo-data';

export const DemoShell = (): ReactElement => {
  return (
    <div className="demo-shell">
      <aside className="demo-sidebar" data-tour-id="demo-sidebar">
        <div className="demo-brand">NexMed</div>
        <p className="demo-center-name">{demoData.organizationName}</p>
        <nav>
          {['Dashboard', 'Agenda', 'Profesionales', 'Especialidades', 'Pacientes', 'Invitación', 'Configuración'].map((item) => (
            <a key={item} className="demo-nav-item">{item}</a>
          ))}
        </nav>
      </aside>
      <div className="demo-main">
        <header className="demo-topbar">
          <div>
            <h1>Demo guiada de NexMed</h1>
            <p>Modo demo seguro · sin datos reales</p>
          </div>
          <div className="demo-user">{demoData.userName}</div>
        </header>

        <section className="demo-card" data-tour-id="demo-dashboard"><h2>Dashboard</h2><div className="demo-kpis"><article><strong>24</strong><span>Turnos semana</span></article><article><strong>4</strong><span>Profesionales activos</span></article><article><strong>4</strong><span>Pacientes vinculados</span></article></div></section>
        <section className="demo-card" data-tour-id="demo-agenda"><h2>Agenda</h2><div className="demo-agenda-grid">{demoData.appointments.map((a)=><div key={a.hour+a.patient} className="demo-row"><span>{a.hour}</span><span>{a.patient}</span><span>{a.type}</span><span>{a.professional}</span><span>{a.status}</span></div>)}</div></section>
        <section className="demo-card" data-tour-id="demo-professionals"><h2>Profesionales</h2><div className="demo-grid">{demoData.professionals.map((p)=><article key={p.name}><h3>{p.name}</h3><p>{p.specialty}</p></article>)}</div></section>
        <section className="demo-card" data-tour-id="demo-specialties"><h2>Especialidades</h2><div className="demo-pills">{demoData.specialties.map((s)=><span key={s}>{s}</span>)}</div></section>
        <section className="demo-card" data-tour-id="demo-patients"><h2>Pacientes</h2><ul>{demoData.patients.map((p)=><li key={p.name}>{p.name}</li>)}</ul></section>
        <section className="demo-card" data-tour-id="demo-patient-detail"><h2>Ficha de paciente</h2><div className="demo-detail"><p><strong>Paciente:</strong> Sofía Ramírez</p><p><strong>Cobertura:</strong> Plan Integral Salud</p><p><strong>Contacto de emergencia:</strong> Laura Ramírez · +54 11 5555 1010</p></div></section>
        <section className="demo-card" data-tour-id="demo-invite"><h2>Invitación por link o QR</h2><p>https://nexmed.app/invitacion/demo-centro</p><div className="demo-qr" /></section>
        <section className="demo-card" data-tour-id="demo-settings"><h2>Configuración del centro</h2><div className="demo-grid"><article>Nombre comercial y razón social</article><article>Horarios operativos</article><article>Reglas de confirmación y recordatorios</article></div></section>
        <section className="demo-card" data-tour-id="demo-closing"><h2>Cierre comercial</h2><p>Todo listo para lanzar NexMed en tu centro.</p></section>
      </div>
    </div>
  );
};
