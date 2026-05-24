import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

import './demo-page.css';

type DemoStep = {
  id: string;
  title: string;
  description: string;
  placement?: 'right' | 'left' | 'bottom';
  cta?: { label: string; href: string; type?: 'primary' | 'secondary' | 'tertiary'; external?: boolean }[];
};

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'demo-overview',
    title: 'Bienvenido a tu panel NexMed',
    description: 'Acá controlás operación diaria, rendimiento de agenda y estado del centro en segundos.',
    placement: 'right'
  },
  {
    id: 'demo-agenda',
    title: 'Agenda y turnos en vivo',
    description: 'Visualizá cada bloque horario por profesional para reducir huecos y cruces.',
    placement: 'right'
  },
  {
    id: 'demo-patients',
    title: 'Pacientes con historial claro',
    description: 'Cada perfil concentra contacto, último turno y riesgo de inasistencia.',
    placement: 'left'
  },
  {
    id: 'demo-reminders',
    title: 'Recordatorios automáticos',
    description: 'WhatsApp y confirmaciones automáticas para sostener ocupación sin sobrecargar recepción.',
    placement: 'left'
  },
  {
    id: 'demo-management',
    title: 'Gestión integral del centro',
    description: 'Organizá profesionales, especialidades y sedes desde un único módulo.',
    placement: 'right'
  },
  {
    id: 'demo-close',
    title: 'Tu centro puede operar así desde hoy',
    description: 'Activá NexMed y llevá agenda, pacientes y comunicación a un flujo profesional.',
    placement: 'bottom',
    cta: [
      { label: 'Registrarse', href: '/register', type: 'primary' },
      { label: 'Hablar por WhatsApp', href: 'https://wa.me/541122626516?text=Hola%2C%20quiero%20activar%20NexMed', type: 'secondary', external: true },
      { label: 'Ingresar', href: '/login', type: 'tertiary' }
    ]
  }
];

export const DemoPage = (): ReactElement => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(true);
  const step = DEMO_STEPS[currentStep] ?? DEMO_STEPS[0]!;

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step.id]);

  const spotlightStyle = useMemo(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    if (!target) return undefined;
    const rect = target.getBoundingClientRect();

  }, [step.id, currentStep, isTourOpen]);

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  return (
    <div className="nx-demo-app">
      <aside className="nx-demo-sidebar" data-tour-id="demo-overview">
        <div className="nx-demo-brand"><span>N</span><div><strong>NexMed</strong><p>Centro Demo · Palermo</p></div></div>
        <nav>
          <a className="is-active" href="#">Inicio</a>
          <a href="#">Agenda</a>
          <a href="#">Pacientes</a>
          <a href="#">Recordatorios</a>
          <a href="#">Profesionales</a>
          <a href="#">Especialidades</a>
          <a href="#">Configuración</a>
        </nav>
        <Link className="nx-btn-tertiary" to="/">Volver a la landing</Link>
      </aside>

      <main className="nx-demo-main">
        <header className="nx-demo-topbar">
          <h1>Panel de operación · Demo guiada</h1>
          <p>Datos de ejemplo · Sin cuenta real</p>
        </header>

        <section className="nx-demo-kpis">
          <article><h3>Turnos hoy</h3><strong>41</strong><span>+12% vs ayer</span></article>
          <article><h3>Confirmados</h3><strong>35</strong><span>85% ocupación</span></article>
          <article><h3>Ausencias previstas</h3><strong>3</strong><span>Mitigadas por recordatorios</span></article>
        </section>

        <section className="nx-demo-grid">
          <article className="nx-demo-card" data-tour-id="demo-agenda">
            <h2>Agenda / Turnos</h2>
            <table><tbody>
              <tr><td>09:00</td><td>Dra. Pérez</td><td>Control dermatológico</td><td className="ok">Confirmado</td></tr>
              <tr><td>10:30</td><td>Dr. Molina</td><td>Primera consulta</td><td className="ok">Confirmado</td></tr>
              <tr><td>12:00</td><td>Lic. Ramos</td><td>Kinesiología</td><td className="warn">Por confirmar</td></tr>
              <tr><td>15:20</td><td>Dra. Pérez</td><td>Seguimiento</td><td className="ok">Confirmado</td></tr>
            </tbody></table>
          </article>

          <article className="nx-demo-card" data-tour-id="demo-patients">
            <h2>Pacientes</h2>
            <ul>
              <li><strong>Camila Rivas</strong><span>Último turno: 10/05 · Riesgo bajo</span></li>
              <li><strong>Sebastián Torres</strong><span>Último turno: 18/05 · Reagenda pendiente</span></li>
              <li><strong>Laura Giménez</strong><span>Último turno: 02/05 · Requiere seguimiento</span></li>
            </ul>
          </article>

          <article className="nx-demo-card" data-tour-id="demo-reminders">
            <h2>Recordatorios / Notificaciones</h2>
            <ul>
              <li>WhatsApp 24h antes <b>Activo</b> · 31 envíos hoy</li>
              <li>Confirmación 2h antes <b>Activo</b> · 25 respuestas</li>
              <li>Reagenda automática <b>Activa</b> · 4 turnos recuperados</li>
            </ul>
          </article>

          <article className="nx-demo-card" data-tour-id="demo-management">
            <h2>Gestión del centro</h2>
            <ul>
              <li>12 profesionales activos · 3 sedes</li>
              <li>9 especialidades habilitadas</li>
              <li>4 reglas operativas en configuración</li>
            </ul>
          </article>

          <article className="nx-demo-card nx-demo-card--cta" data-tour-id="demo-close">
            <h2>¿Querés este flujo en tu centro?</h2>
            <p>Implementación guiada para ordenar agenda, pacientes y comunicación desde el primer día.</p>
          </article>
        </section>
      </main>

      {isTourOpen ? <div className="nx-tour" role="dialog" aria-modal="true"><div className="nx-tour__overlay" />
        {spotlightStyle ? <div className="nx-tour__spotlight" style={spotlightStyle} /> : null}
        <aside className={`nx-tour__panel is-${step.placement ?? 'right'}`}>
          <div className="nx-tour__panel-head"><span>Paso {currentStep + 1}/{DEMO_STEPS.length}</span><button onClick={() => setIsTourOpen(false)}>Omitir</button></div>
          <div className="nx-tour__progress"><span style={{ width: `${progress}%` }} /></div>
          <h3>{step.title}</h3><p>{step.description}</p>
          {step.cta ? <div className="nx-tour__actions nx-tour__actions--close">{step.cta.map((item) => item.external ? <a key={item.label} href={item.href} className={`nx-btn${item.type === 'secondary' ? '-secondary' : item.type === 'tertiary' ? '-tertiary' : ''}`} target="_blank" rel="noreferrer">{item.label}</a> : <Link key={item.label} to={item.href} className={`nx-btn${item.type === 'secondary' ? '-secondary' : item.type === 'tertiary' ? '-tertiary' : ''}`}>{item.label}</Link>)}</div> : null}
          <div className="nx-tour__actions"><button className="nx-btn-tertiary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>Anterior</button>{currentStep === DEMO_STEPS.length - 1 ? <button className="nx-btn-secondary" onClick={() => setCurrentStep(0)}>Reiniciar</button> : <button className="nx-btn" onClick={() => setCurrentStep((s) => Math.min(DEMO_STEPS.length - 1, s + 1))}>Siguiente</button>}</div>
        </aside></div> : <button className="nx-demo-restart" onClick={() => setIsTourOpen(true)}>Reanudar demo</button>}
    </div>
  );
};
