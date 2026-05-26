import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

import './demo-page.css';

type DemoStep = {
  id: string;
  title: string;
  description: string;
  placement?: 'right' | 'left' | 'bottom';
};

const DEMO_STEPS: DemoStep[] = [
  { id: 'demo-dashboard', title: 'Bienvenido al panel de tu centro', description: 'Desde acá podés controlar turnos, profesionales, pacientes y recordatorios en una sola plataforma.', placement: 'right' },
  { id: 'demo-agenda', title: 'Agenda clara y organizada', description: 'Visualizá la semana completa, filtrá por profesional o estado, y gestioná turnos de forma simple y ordenada.', placement: 'right' },
  { id: 'demo-professionals', title: 'Gestioná tus profesionales', description: 'Cargá profesionales, especialidades y datos clave para mantener organizada la atención de tu centro.', placement: 'left' },
  { id: 'demo-patients', title: 'Información del paciente siempre disponible', description: 'Consultá rápidamente cobertura, contacto y datos relevantes desde un solo lugar.', placement: 'left' },
  { id: 'demo-reminders', title: 'Recordatorios automáticos', description: 'Reducí olvidos y tareas manuales con avisos configurables para mantener informados a tus pacientes.', placement: 'right' },
  { id: 'demo-settings', title: 'Adaptado a tu forma de trabajar', description: 'Configurá tu centro, compartí invitaciones y organizá el flujo operativo según tus necesidades.', placement: 'left' },
  { id: 'demo-close', title: 'NexMed te ayuda a ordenar tu centro desde el primer día', description: 'Gestioná agenda, pacientes, profesionales y recordatorios desde una plataforma simple, moderna y preparada para crecer con tu equipo.', placement: 'bottom' }
];

export const DemoPage = (): ReactElement => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(true);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const step = DEMO_STEPS[currentStep] ?? DEMO_STEPS[0]!;

  useEffect(() => {
    if (!isTourOpen) return;
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [step.id, isTourOpen]);

  const spotlightStyle = useMemo<CSSProperties | undefined>(() => {
    if (!isTourOpen) return undefined;
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    if (!target) return undefined;
    const rect = target.getBoundingClientRect();
    return {
      top: Math.max(rect.top - 8, 8),
      left: Math.max(rect.left - 8, 8),
      width: Math.min(rect.width + 16, window.innerWidth - 16),
      height: rect.height + 16
    };
  }, [step.id, isTourOpen, currentStep]);

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  return (
    <div className="nx-demo-app">
      <aside className="nx-demo-sidebar">
        <div className="nx-demo-brand"><span>N</span><div><strong>NexMed</strong><p>Centro Médico Demo NexMed</p></div></div>
        <nav>
          <a className="is-active" href="#demo-dashboard">Inicio</a>
          <a href="#demo-agenda">Agenda</a>
          <a href="#demo-professionals">Profesionales</a>
          <a href="#demo-patients">Pacientes</a>
          <a href="#demo-reminders">Recordatorios</a>
          <a href="#demo-settings">Configuración</a>
        </nav>
        <Link className="nx-btn-tertiary" to="/">Volver a la landing</Link>
      </aside>

      <main className="nx-demo-main">
        <header className="nx-demo-topbar" data-tour-id="demo-dashboard" id="demo-dashboard">
          <div><h1>Panel de operación · Demo guiada</h1><p>Sin login · Datos 100% ficticios y seguros</p></div>
          <div className="nx-demo-user">Recepción Demo · Admin</div>
        </header>
        <section className="nx-demo-kpis">
          <article><h3>Turnos hoy</h3><strong>28</strong><span>5 pendientes de confirmación</span></article>
          <article><h3>Profesionales activos</h3><strong>4</strong><span>Todas las especialidades cubiertas</span></article>
          <article><h3>Recordatorios enviados</h3><strong>52</strong><span>WhatsApp + Email automatizados</span></article>
        </section>

        <section className="nx-demo-grid">
          <article className="nx-demo-card" data-tour-id="demo-agenda" id="demo-agenda"><h2>Agenda semanal premium</h2><table><tbody>
            <tr><td>09:00</td><td>Dra. Laura Méndez</td><td>Consulta inicial · Sofía Ramírez</td><td className="ok">Confirmado</td></tr>
            <tr><td>10:20</td><td>Dr. Martín Rojas</td><td>Revisión odontológica · Carlos Benítez</td><td className="ok">Confirmado</td></tr>
            <tr><td>13:00</td><td>Lic. Camila Torres</td><td>Sesión de kinesiología · Mariana López</td><td className="warn">Por confirmar</td></tr>
            <tr><td>16:40</td><td>Est. Valentina Suárez</td><td>Tratamiento estético · Federico Gómez</td><td className="ok">Confirmado</td></tr>
          </tbody></table></article>

          <article className="nx-demo-card" data-tour-id="demo-professionals" id="demo-professionals"><h2>Profesionales</h2><ul>
            <li><strong>Dra. Laura Méndez</strong><span>Clínica médica · Activa</span></li>
            <li><strong>Dr. Martín Rojas</strong><span>Odontología · Activo</span></li>
            <li><strong>Lic. Camila Torres</strong><span>Kinesiología · Activa</span></li>
            <li><strong>Est. Valentina Suárez</strong><span>Estética facial · Activa</span></li>
          </ul></article>

          <article className="nx-demo-card" data-tour-id="demo-patients" id="demo-patients"><h2>Pacientes</h2><ul>
            <li><button className="nx-link-btn" onClick={() => setPatientModalOpen(true)}>Sofía Ramírez</button><span>Obra social al día · Tel. verificado</span></li>
            <li><strong>Carlos Benítez</strong><span>Control mensual programado</span></li>
            <li><strong>Mariana López</strong><span>Antecedentes cargados</span></li>
            <li><strong>Federico Gómez</strong><span>Recordatorio automático activo</span></li>
          </ul></article>

          <article className="nx-demo-card" data-tour-id="demo-reminders" id="demo-reminders"><h2>Recordatorios y notificaciones</h2><ul>
            <li>24h antes por WhatsApp · <b>Activo</b></li><li>2h antes por email · <b>Activo</b></li><li>Confirmación de asistencia automática · <b>Activo</b></li>
          </ul></article>

          <article className="nx-demo-card" data-tour-id="demo-settings" id="demo-settings"><h2>Configuración e invitación del centro</h2><ul>
            <li>Link de acceso para pacientes habilitado</li><li>QR para recepción listo para imprimir</li><li>Reglas operativas y horarios por especialidad configurados</li>
          </ul></article>

          <article className="nx-demo-card nx-demo-card--cta" data-tour-id="demo-close" id="demo-close"><h2>Cierre de demo</h2><p>Implementación guiada para ordenar agenda, pacientes y comunicación de punta a punta.</p></article>
        </section>
      </main>

      {patientModalOpen ? <div className="nx-demo-modal"><div><h3>Ficha demo · Sofía Ramírez</h3><p>Cobertura: Plan Integral · Próximo turno: viernes 10:00 · Contacto validado.</p><button className="nx-btn-tertiary" onClick={() => setPatientModalOpen(false)}>Cerrar</button></div></div> : null}

      {isTourOpen ? <div className="nx-tour" role="dialog" aria-modal="true"><div className="nx-tour__overlay" />
        {spotlightStyle ? <div className="nx-tour__spotlight" style={spotlightStyle} /> : null}
        <aside className={`nx-tour__panel is-${step.placement ?? 'right'}`}><div className="nx-tour__panel-head"><span>Paso {currentStep + 1} de {DEMO_STEPS.length}</span><button onClick={() => setIsTourOpen(false)}>Cerrar</button></div>
          <div className="nx-tour__progress"><span style={{ width: `${progress}%` }} /></div><h3>{step.title}</h3><p>{step.description}</p>
          {currentStep === DEMO_STEPS.length - 1 ? <div className="nx-tour__actions nx-tour__actions--close"><Link className="nx-btn" to="/register">Crear cuenta</Link><a className="nx-btn-secondary" href="https://wa.me/541122626516?text=Hola%2C%20quiero%20activar%20NexMed" target="_blank" rel="noreferrer">Hablar por WhatsApp</a><Link className="nx-btn-tertiary" to="/">Volver a la landing</Link></div> : null}
          <div className="nx-tour__actions"><button className="nx-btn-tertiary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>Anterior</button><button className="nx-btn-secondary" onClick={() => setIsTourOpen(false)}>Omitir</button><button className="nx-btn" onClick={() => setCurrentStep((s) => Math.min(DEMO_STEPS.length - 1, s + 1))}>{currentStep === DEMO_STEPS.length - 1 ? 'Reiniciar' : 'Siguiente'}</button></div>
        </aside></div> : <button className="nx-demo-restart" onClick={() => { setIsTourOpen(true); setCurrentStep(0); }}>Reanudar demo</button>}
    </div>
  );
};
