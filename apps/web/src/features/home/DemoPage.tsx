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
};
