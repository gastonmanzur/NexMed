import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { demoTourSteps } from './demo-tour-steps';
import type { DemoSectionId } from './demo-data';

export const DemoTour = ({ activeSection, onSectionChange }: { activeSection: DemoSectionId; onSectionChange: (section: DemoSectionId) => void }): ReactElement => {
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const step = demoTourSteps[stepIndex]!;

  useEffect(() => {
    if (!open) return;
    if (activeSection !== step.section) onSectionChange(step.section);
  }, [step.section, open, activeSection, onSectionChange]);

  useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step.id, open, activeSection]);

  const spot = useMemo<CSSProperties | undefined>(() => {
    if (!open) return undefined;
    const node = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    if (!node) return undefined;
    const r = node.getBoundingClientRect();
    return { top: Math.max(8, r.top - 10), left: Math.max(8, r.left - 10), width: Math.min(window.innerWidth - 16, r.width + 20), height: r.height + 20 };
  }, [open, step.id, stepIndex, activeSection]);

  const progress = ((stepIndex + 1) / demoTourSteps.length) * 100;

  return <>
    {!open ? <button className="demo-tour-trigger" onClick={() => setOpen(true)}>Ver recorrido guiado</button> : null}
    {open ? <div className="demo-tour" role="dialog" aria-modal="true">
      <div className="demo-tour-overlay" onClick={() => setOpen(false)} />
      {spot ? <div className="demo-tour-spot" style={spot} /> : null}
      <aside className="demo-tour-panel">
        <div className="demo-tour-head"><span>Paso {stepIndex + 1} de {demoTourSteps.length}</span><button onClick={() => setOpen(false)}>Cerrar</button></div>
        <div className="demo-tour-progress"><span style={{ width: `${progress}%` }} /></div>
        <h3>{step.title}</h3><p>{step.description}</p>
        {stepIndex === demoTourSteps.length - 1 ? <div className="demo-tour-cta"><Link to="/register" className="nx-btn">Crear cuenta</Link><a href="https://wa.me/541122626516?text=Hola%2C%20quiero%20activar%20NexMed" target="_blank" rel="noreferrer" className="nx-btn-secondary">Hablar por WhatsApp</a><Link to="/" className="nx-btn-tertiary">Volver a la landing</Link></div> : null}
        <div className="demo-tour-actions"><button className="nx-btn-tertiary" disabled={stepIndex===0} onClick={() => setStepIndex((v)=>Math.max(0,v-1))}>Anterior</button><button className="nx-btn-secondary" onClick={() => setOpen(false)}>Omitir</button><button className="nx-btn" onClick={() => setStepIndex((v)=>Math.min(demoTourSteps.length-1,v+1))}>{stepIndex===demoTourSteps.length-1?'Finalizar':'Siguiente'}</button></div>
      </aside>
    </div> : null}
  </>;
};
