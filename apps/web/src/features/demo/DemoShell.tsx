import { useMemo, useState, type ReactElement } from 'react';
import { demoData, type DemoSectionId } from './demo-data';

const disabledMessage = 'Esta acción está deshabilitada en la demo. Creá tu cuenta para usar NexMed con tu centro.';

export const DemoShell = ({ activeSection, onSectionChange }: { activeSection: DemoSectionId; onSectionChange: (section: DemoSectionId) => void }): ReactElement => {
  const [selectedPatient, setSelectedPatient] = useState(demoData.patients[0] ?? null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [disabledActionNotice, setDisabledActionNotice] = useState('');

  const sectionTitle = useMemo(() => demoData.sections.find((s) => s.id === activeSection)?.label ?? 'Demo', [activeSection]);
  const showDisabled = () => setDisabledActionNotice(disabledMessage);

  return <div className="demo-shell">
    <aside className="demo-sidebar" data-tour-id="demo-sidebar">
      <div className="demo-brand">NexMed</div><p className="demo-center-name">{demoData.organizationName}</p>
      <nav>{demoData.sections.map((item) => <button key={item.id} className={`demo-nav-item ${activeSection===item.id?'is-active':''}`} onClick={() => onSectionChange(item.id)}>{item.label}</button>)}</nav>
      <button className="nx-btn-secondary demo-side-cta" onClick={showDisabled}>Probar acción real</button>
    </aside>

    <div className="demo-main">
      <header className="demo-topbar"><div><h1>{sectionTitle}</h1><p>Modo demo seguro · sin login real · datos ficticios</p></div><div className="demo-user">{demoData.userName}</div></header>
      {disabledActionNotice ? <div className="demo-notice">{disabledActionNotice}<button onClick={() => setDisabledActionNotice('')}>Cerrar</button></div> : null}

      {activeSection === 'dashboard' ? <section className="demo-card" data-tour-id="demo-dashboard"><h2>Resumen operativo</h2><div className="demo-kpis"><article><strong>5</strong><span>Turnos de hoy</span></article><article><strong>4</strong><span>Pacientes vinculados</span></article><article><strong>4</strong><span>Profesionales activos</span></article><article><strong>8</strong><span>Próximos turnos</span></article><article><strong>3</strong><span>Recordatorios activos</span></article><article><strong>97%</strong><span>Confirmación semanal</span></article></div></section> : null}

      {activeSection === 'agenda' ? <section className="demo-card" data-tour-id="demo-agenda"><h2>Agenda semanal</h2><div className="demo-toolbar"><button className="demo-filter">Todos los profesionales</button><button className="demo-filter">Estado: Todos</button><button className="demo-filter" onClick={showDisabled}>Nuevo turno</button></div><div className="demo-agenda-grid">{demoData.appointments.map((a)=><div key={a.day+a.hour+a.patient} className="demo-row"><span>{a.day}</span><span>{a.hour}</span><span>{a.patient}</span><span>{a.type}</span><span>{a.professional}</span><span>{a.status}</span></div>)}</div></section> : null}

      {activeSection === 'professionals' ? <section className="demo-card" data-tour-id="demo-professionals"><h2>Equipo profesional</h2><button className="demo-filter" onClick={showDisabled}>+ Nuevo profesional</button><div className="demo-grid">{demoData.professionals.map((p)=><article key={p.name}><div className="demo-avatar">{p.name.split(' ').slice(0,2).map((n)=>n[0]).join('')}</div><h3>{p.name}</h3><p>{p.specialty}</p><span>{p.status}</span></article>)}</div></section> : null}

      {activeSection === 'specialties' ? <section className="demo-card" data-tour-id="demo-specialties"><h2>Especialidades y servicios</h2><button className="demo-filter" onClick={showDisabled}>+ Nueva especialidad</button><div className="demo-agenda-grid">{demoData.specialties.map((s)=><div key={s.name} className="demo-row"><span>{s.name}</span><span>{s.description}</span><span>{s.status}</span></div>)}</div></section> : null}

      {activeSection === 'patients' ? <section className="demo-card" data-tour-id="demo-patients"><h2>Pacientes</h2><div className="demo-toolbar"><input className="demo-input" placeholder="Buscar paciente" readOnly value="Sofía" /></div><div className="demo-grid">{demoData.patients.map((p)=><article key={p.name}><div className="demo-avatar">{p.name.split(' ').map((n)=>n[0]).join('')}</div><h3>{p.name}</h3><p>{p.coverage}</p><button className="demo-filter" onClick={() => { setSelectedPatient(p); setShowPatientModal(true); }}>Ver detalle</button></article>)}</div></section> : null}

      {activeSection === 'invitations' ? <section className="demo-card" data-tour-id="demo-invite"><h2>Invitación por link o QR</h2><p>Compartí este acceso con tus pacientes para vincularlos al centro.</p><div className="demo-detail"><p>https://nexmed.app/invitacion/demo-centro</p><button className="demo-filter" onClick={showDisabled}>Copiar link</button></div><div className="demo-qr" /></section> : null}
      {activeSection === 'settings' ? <section className="demo-card" data-tour-id="demo-settings"><h2>Configuración del centro</h2><div className="demo-grid"><article>Centro: {demoData.organizationName}</article><article>Contacto: demo@nexmed.app</article><article>Zona horaria: America/Argentina/Buenos_Aires</article><article>Duración turno base: 30 min</article><article>Recordatorios por WhatsApp: Activo</article><article><button className="demo-filter" onClick={showDisabled}>Guardar cambios</button></article></div></section> : null}
      {activeSection === 'notifications' ? <section className="demo-card"><h2>Notificaciones y recordatorios</h2><div className="demo-agenda-grid"><div className="demo-row"><span>Regla</span><span>24h antes del turno</span><span>Activa</span></div><div className="demo-row"><span>Regla</span><span>2h antes del turno</span><span>Activa</span></div><div className="demo-row"><span>Próximo envío</span><span>Hoy 19:00</span><span>Programado</span></div></div></section> : null}
      {activeSection === 'subscription' ? <section className="demo-card"><h2>Suscripción</h2><div className="demo-grid"><article><h3>Plan Growth</h3><p>Hasta 8 profesionales</p><button className="demo-filter" onClick={showDisabled}>Elegir plan</button></article><article><h3>Plan Scale</h3><p>Centros con múltiples sedes</p><button className="demo-filter" onClick={showDisabled}>Elegir plan</button></article></div></section> : null}
    </div>

    {showPatientModal && selectedPatient ? <div className="demo-modal" data-tour-id="demo-patient-detail"><div className="demo-modal-card"><h3>Ficha paciente</h3><p><strong>Nombre:</strong> {selectedPatient.name}</p><p><strong>Cobertura:</strong> {selectedPatient.coverage}</p><p><strong>N.º afiliado:</strong> {selectedPatient.memberId}</p><p><strong>Contacto de emergencia:</strong> {selectedPatient.emergencyContact}</p><p><strong>Resumen:</strong> Paciente con controles mensuales al día.</p><div className="demo-tour-actions"><button className="nx-btn-tertiary" onClick={() => setShowPatientModal(false)}>Cerrar</button><button className="nx-btn" onClick={showDisabled}>Editar</button></div></div></div> : null}
  </div>;
};
