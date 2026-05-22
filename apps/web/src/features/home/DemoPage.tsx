import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@starter/ui';
import { AppShell } from '../../components/AppShell';
import './demo-page.css';

type DemoStep = { id: string; title: string; description: string; };

const DEMO_STEPS: DemoStep[] = [
  { id: 'tour-welcome', title: 'Bienvenido a NexMed', description: 'Este es el layout real de NexMed: navegación, módulos y flujo operativo en un solo lugar.' },
  { id: 'tour-agenda', title: 'Agenda y turnos', description: 'Desde Agenda coordinás disponibilidad, altas y cambios de turnos con una vista operativa clara.' },
  { id: 'tour-patients', title: 'Pacientes', description: 'La gestión de pacientes te permite sostener seguimiento y contexto clínico con menos fricción.' },
  { id: 'tour-reminders', title: 'Recordatorios y notificaciones', description: 'Activás recordatorios y avisos para bajar ausencias y mejorar confirmaciones.' },
  { id: 'tour-management', title: 'Gestión del centro', description: 'Configurás profesionales, especialidades y parámetros del centro desde módulos reales.' },
  { id: 'tour-close', title: 'Listo para implementar NexMed', description: 'Ya viste la app real. El siguiente paso es activar tu cuenta o hablar con nosotros.' }
];

export const DemoPage = (): ReactElement => {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(true);
  const step = DEMO_STEPS[idx]!;

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step.id]);

  const spotlight = useMemo(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    if (!el || !open) return undefined;
    const r = el.getBoundingClientRect();
    return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 };
  }, [step.id, open]);

  const progress = ((idx + 1) / DEMO_STEPS.length) * 100;

  const content = (
    <main className="nx-page nx-demo-real">
      <div data-tour-id="tour-welcome"><Card title="Dashboard del centro (modo demo)" subtitle="Interfaz real de NexMed con contenido seguro de demostración." className="nx-hero-card">
        <p>Esta demo usa layout, navegación y estructura reales del producto, sin exponer datos productivos.</p>
      </Card></div>

      <section className="nx-kpis" data-tour-id="tour-agenda">
        <article className="nx-kpi"><span>Turnos hoy</span><p>42</p></article>
        <article className="nx-kpi"><span>Confirmados</span><p>35</p></article>
        <article className="nx-kpi"><span>Reprogramados</span><p>4</p></article>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '0.75rem' }}>
        <div data-tour-id="tour-patients"><Card title="Pacientes" subtitle="Seguimiento y acceso centralizado.">
          <Link className="nx-btn-secondary" to="/patient/profile">Ver módulo real</Link>
        </Card></div>
        <div data-tour-id="tour-reminders"><Card title="Recordatorios" subtitle="Automatizaciones y avisos configurables." data-tour-id="tour-reminders">
          <Link className="nx-btn-secondary" to="/organization/settings/reminders">Ver módulo real</Link>
        </Card></div>
        <div data-tour-id="tour-management"><Card title="Gestión del centro" subtitle="Profesionales, especialidades y configuración." data-tour-id="tour-management">
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <Link className="nx-btn-secondary" to="/app/professionals">Profesionales</Link>
            <Link className="nx-btn-secondary" to="/app/specialties">Especialidades</Link>
          </div>
        </Card></div>
      </section>

      <div data-tour-id="tour-close"><Card title="Cierre" subtitle="Tomá acción ahora">
        <div className="nx-tour__actions">
          <Link className="nx-btn" to="/register">Registrarse</Link>
          <a className="nx-btn-secondary" href="https://wa.me/541122626516?text=Hola%2C%20quiero%20activar%20NexMed" target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
          <Link className="nx-btn-tertiary" to="/login">Ingresar</Link>
        </div>
      </Card></div>

      {open ? <div className="nx-tour" role="dialog" aria-modal="true"><div className="nx-tour__overlay" />{spotlight ? <div className="nx-tour__spotlight" style={spotlight} /> : null}
        <aside className="nx-tour__panel"><div className="nx-tour__panel-head"><span>Paso {idx + 1}/{DEMO_STEPS.length}</span><button onClick={() => setOpen(false)} type="button">Omitir</button></div><div className="nx-tour__progress"><span style={{ width: `${progress}%` }} /></div><h3>{step.title}</h3><p>{step.description}</p><div className="nx-tour__actions"><button type="button" className="nx-btn-tertiary" disabled={idx===0} onClick={()=>setIdx((v)=>Math.max(0,v-1))}>Atrás</button>{idx===DEMO_STEPS.length-1?<button type="button" className="nx-btn-secondary" onClick={()=>setIdx(0)}>Reiniciar</button>:<button type="button" className="nx-btn" onClick={()=>setIdx((v)=>Math.min(DEMO_STEPS.length-1,v+1))}>Siguiente</button>}</div></aside></div> : <button className="nx-demo-restart" onClick={()=>setOpen(true)} type="button">Reanudar demo</button>}
    </main>
  );

  return <AppShell>{content}</AppShell>;

import './demo-page.css';

type DemoStep = {
  id: string;
  title: string;
  description: string;
  cta?: { label: string; href: string; type?: 'primary' | 'secondary' | 'tertiary'; external?: boolean }[];
};

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'demo-overview',
    title: 'Bienvenido a NexMed',
    description: 'Unificá agenda, turnos y pacientes en una sola operación clara para tu centro.'
  },
  {
    id: 'demo-agenda',
    title: 'Agenda y disponibilidad',
    description: 'Visualizá la disponibilidad del equipo en segundos y evitá cruces de turnos.'
  },
  {
    id: 'demo-bookings',
    title: 'Reservas sin fricción',
    description: 'El paciente reserva o reprograma con flujo guiado, sin saturar a recepción.'
  },
  {
    id: 'demo-reminders',
    title: 'Recordatorios automáticos',
    description: 'Confirmaciones y avisos en piloto automático para reducir ausencias.'
  },
  {
    id: 'demo-management',
    title: 'Gestión del centro',
    description: 'Coordiná profesionales, especialidades y carga operativa desde un solo panel.'
  },
  {
    id: 'demo-close',
    title: 'Listo para escalar tu operación',
    description: 'Activá NexMed y convertí una agenda desordenada en una experiencia profesional.',
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
  const step: DemoStep = DEMO_STEPS[currentStep] ?? DEMO_STEPS[0]!;

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [step.id]);

  const spotlightStyle = useMemo(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    if (!target) return undefined;
    const rect = target.getBoundingClientRect();
    return {
      top: rect.top - 10,
      left: rect.left - 10,
      width: rect.width + 20,
      height: rect.height + 20
    };
  }, [step.id, currentStep, isTourOpen]);

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  return (
    <div className="nx-demo-page">
      <header className="nx-demo-header" data-tour-id="demo-overview">
        <div>
          <p className="nx-demo-kicker">Demo guiada NexMed</p>
          <h1>Tour interactivo de producto</h1>
          <p>Recorrido seguro con datos de ejemplo para mostrar el valor operativo real de NexMed.</p>
        </div>
        <Link className="nx-btn-tertiary" to="/">Volver a la landing</Link>
      </header>

      <main className="nx-demo-grid">
        <section className="nx-demo-card" data-tour-id="demo-agenda">
          <h2>Agenda de hoy</h2>
          <ul>
            <li><strong>Dra. Pérez</strong> · 09:00 a 13:00 · 7 turnos confirmados</li>
            <li><strong>Dr. Molina</strong> · 10:00 a 18:00 · 12 turnos confirmados</li>
            <li><strong>Lic. Ramos</strong> · 14:00 a 20:00 · 8 turnos confirmados</li>
          </ul>
        </section>

        <section className="nx-demo-card" data-tour-id="demo-bookings">
          <h2>Reservas recientes</h2>
          <ul>
            <li>Camila R. reservó Dermatología · 17:20</li>
            <li>Sebastián T. reprogramó Kinesiología · 16:48</li>
            <li>Laura G. confirmó Odontología · 15:12</li>
          </ul>
        </section>

        <section className="nx-demo-card" data-tour-id="demo-reminders">
          <h2>Automatizaciones activas</h2>
          <ul>
            <li>WhatsApp 24h antes: <strong>Activo</strong></li>
            <li>Recordatorio 2h antes: <strong>Activo</strong></li>
            <li>Reagenda automática por ausencia: <strong>Activo</strong></li>
          </ul>
        </section>

        <section className="nx-demo-card" data-tour-id="demo-management">
          <h2>Control del centro</h2>
          <ul>
            <li>12 profesionales activos</li>
            <li>9 especialidades configuradas</li>
            <li>3 sedes sincronizadas</li>
          </ul>
        </section>

        <section className="nx-demo-card nx-demo-card--cta" data-tour-id="demo-close">
          <h2>¿Seguimos con tu centro?</h2>
          <p>Podés empezar hoy con un flujo ordenado de agenda, reservas y recordatorios.</p>
        </section>
      </main>

      {isTourOpen ? (
        <div className="nx-tour" role="dialog" aria-modal="true" aria-labelledby="nx-tour-title">
          <div className="nx-tour__overlay" />
          {spotlightStyle ? <div className="nx-tour__spotlight" style={spotlightStyle} /> : null}
          <aside className="nx-tour__panel">
            <div className="nx-tour__panel-head">
              <span>Paso {currentStep + 1}/{DEMO_STEPS.length}</span>
              <button type="button" onClick={() => setIsTourOpen(false)}>Omitir</button>
            </div>
            <div className="nx-tour__progress"><span style={{ width: `${progress}%` }} /></div>
            <h3 id="nx-tour-title">{step.title}</h3>
            <p>{step.description}</p>

            {step.cta ? (
              <div className="nx-tour__actions nx-tour__actions--close">
                {step.cta.map((item) =>
                  item.external ? (
                    <a key={item.label} href={item.href} className={`nx-btn${item.type === 'secondary' ? '-secondary' : item.type === 'tertiary' ? '-tertiary' : ''}`} target="_blank" rel="noreferrer">
                      {item.label}
                    </a>
                  ) : (
                    <Link key={item.label} to={item.href} className={`nx-btn${item.type === 'secondary' ? '-secondary' : item.type === 'tertiary' ? '-tertiary' : ''}`}>
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            ) : null}

            <div className="nx-tour__actions">
              <button type="button" className="nx-btn-tertiary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>Atrás</button>
              {currentStep === DEMO_STEPS.length - 1 ? (
                <button type="button" className="nx-btn-secondary" onClick={() => setCurrentStep(0)}>Reiniciar</button>
              ) : (
                <button type="button" className="nx-btn" onClick={() => setCurrentStep((s) => Math.min(DEMO_STEPS.length - 1, s + 1))}>Siguiente</button>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <button className="nx-demo-restart" type="button" onClick={() => setIsTourOpen(true)}>Reanudar demo</button>
      )}
    </div>
  );

};
