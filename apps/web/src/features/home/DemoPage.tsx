import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

import './demo-page.css';

type DemoStep = { id: string; title: string; description: string; placement?: 'right' | 'left' | 'bottom' };

const DEMO_STEPS: DemoStep[] = [
  { id: 'step-01-login', title: 'Acceso simple y seguro', description: 'Ingresá o registrate para comenzar a gestionar tu centro desde una plataforma moderna y organizada.', placement: 'right' },
  { id: 'step-02-dashboard', title: 'Panel central del centro', description: 'Desde el dashboard podés ver el estado general del centro, accesos rápidos y un resumen operativo de la actividad.', placement: 'right' },
  { id: 'step-03-dashboard-2', title: 'Información clave en un solo lugar', description: 'Visualizá indicadores importantes, accesos a módulos y datos útiles para gestionar mejor la operación diaria.', placement: 'right' },
  { id: 'step-04-profesionales', title: 'Gestioná tus profesionales', description: 'Cargá profesionales, agregá sus datos, especialidades y fotos para mantener organizado el equipo de atención.', placement: 'left' },
  { id: 'step-05-especialidades', title: 'Organizá tus especialidades', description: 'Definí los servicios o especialidades del centro para ordenar la agenda y facilitar la reserva de turnos.', placement: 'left' },
  { id: 'step-06-agenda', title: 'Agenda visual y ordenada', description: 'Consultá turnos, filtrá por profesional o estado, y organizá la semana de trabajo desde una vista clara y profesional.', placement: 'right' },
  { id: 'step-07-pacientes', title: 'Pacientes vinculados al centro', description: 'Accedé rápidamente a tus pacientes asociados y consultá su información cuando el centro la necesite.', placement: 'left' },
  { id: 'step-08-datos', title: 'Datos relevantes del paciente', description: 'Visualizá información personal, cobertura, contacto de emergencia y datos importantes para la atención.', placement: 'right' },
  { id: 'step-09-invitacion', title: 'Vinculación por link o QR', description: 'Invitá pacientes de forma simple para que puedan registrarse y quedar vinculados al centro.', placement: 'left' },
  { id: 'step-10-config', title: 'Configuración flexible del centro', description: 'Personalizá datos del centro, ajustes operativos y opciones clave para adaptar NexMed a tu forma de trabajar.', placement: 'left' },
  { id: 'step-11-cierre', title: 'NexMed está preparado para ordenar tu centro', description: 'Gestioná agenda, profesionales, pacientes, invitaciones y recordatorios desde una plataforma simple, moderna y pensada para consultorios, clínicas y centros de estética.', placement: 'bottom' }
];

export const DemoPage = (): ReactElement => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourOpen, setIsTourOpen] = useState(true);
  const step = DEMO_STEPS[currentStep] ?? DEMO_STEPS[0]!;

  useEffect(() => {
    if (!isTourOpen) return;
    document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [step.id, isTourOpen]);

  const spotlightStyle = useMemo<CSSProperties | undefined>(() => {
    if (!isTourOpen) return undefined;
    const t = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
    if (!t) return undefined;
    const r = t.getBoundingClientRect();
    return { top: Math.max(r.top - 8, 8), left: Math.max(r.left - 8, 8), width: Math.min(r.width + 16, window.innerWidth - 16), height: r.height + 16 };
  }, [step.id, isTourOpen, currentStep]);

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  return <div className="nx-demo-wrap">
    <div className="nx-shot nx-login" data-tour-id="step-01-login"><div className="nx-login-card"><h2>Login</h2><p>Ingresá con tu cuenta</p><button>Ingresar</button><span>Crear cuenta</span></div></div>
    <section className="nx-shot" data-tour-id="step-02-dashboard"><h3>Centro Medico oftalmológico Manzur</h3><div className="nx-hero" /></section>
    <section className="nx-shot" data-tour-id="step-03-dashboard-2"><h3>Resumen operativo</h3><div className="nx-cards"><article>Turnos hoy: 0</article><article>Próx. 7 días: 0</article><article>Pacientes vinculados: 2</article></div></section>
    <section className="nx-shot" data-tour-id="step-04-profesionales"><h3>Profesionales</h3><ul><li>Dra. Laura Méndez</li><li>Dr. Martín Rojas</li><li>Lic. Camila Torres</li><li>Est. Valentina Suárez</li></ul></section>
    <section className="nx-shot" data-tour-id="step-05-especialidades"><h3>Especialidades</h3><ul><li>Consulta inicial</li><li>Control mensual</li><li>Estética facial</li><li>Revisión odontológica</li><li>Sesión de kinesiología</li></ul></section>
    <section className="nx-shot" data-tour-id="step-06-agenda"><h3>Agenda semanal</h3><div className="nx-grid"><span>11:00</span><span>Sofía Ramírez · Confirmado</span><span>12:00</span><span>Carlos Benítez · Confirmado</span></div></section>
    <section className="nx-shot" data-tour-id="step-07-pacientes"><h3>Pacientes</h3><div className="nx-pills"><span>Sofía Ramírez</span><span>Carlos Benítez</span><span>Mariana López</span><span>Federico Gómez</span></div></section>
    <section className="nx-shot" data-tour-id="step-08-datos"><h3>Datos de pacientes</h3><div className="nx-cards"><article>Email: demo@example.com</article><article>Cobertura: Plan Integral</article><article>Contacto emergencia: Laura</article></div></section>
    <section className="nx-shot" data-tour-id="step-09-invitacion"><h3>Invitación para pacientes</h3><p>Link y QR de invitación disponibles.</p><div className="nx-qr" /></section>
    <section className="nx-shot" data-tour-id="step-10-config"><h3>Perfil del centro</h3><div className="nx-cards"><article>Nombre comercial</article><article>Tipo de organización</article><article>Contacto y ubicación</article></div></section>
    <section className="nx-shot" data-tour-id="step-11-cierre"><h2>Cierre comercial</h2><p>Demo profesional NexMed.</p></section>

    {isTourOpen ? <div className="nx-tour" role="dialog" aria-modal="true"><div className="nx-tour__overlay" />{spotlightStyle ? <div className="nx-tour__spotlight" style={spotlightStyle} /> : null}
      <aside className={`nx-tour__panel is-${step.placement ?? 'right'}`}><div className="nx-tour__panel-head"><span>Paso {currentStep + 1} de {DEMO_STEPS.length}</span><button onClick={() => setIsTourOpen(false)}>Cerrar</button></div>
        <div className="nx-tour__progress"><span style={{ width: `${progress}%` }} /></div><h3>{step.title}</h3><p>{step.description}</p>
        {currentStep === DEMO_STEPS.length - 1 ? <div className="nx-tour__actions nx-tour__actions--close"><Link className="nx-btn" to="/register">Crear cuenta</Link><a className="nx-btn-secondary" href="https://wa.me/541122626516?text=Hola%2C%20quiero%20activar%20NexMed" target="_blank" rel="noreferrer">Hablar por WhatsApp</a><Link className="nx-btn-tertiary" to="/">Volver a la landing</Link></div> : null}
        <div className="nx-tour__actions"><button className="nx-btn-tertiary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>Anterior</button><button className="nx-btn-secondary" onClick={() => setIsTourOpen(false)}>Omitir</button><button className="nx-btn" onClick={() => setCurrentStep((s) => currentStep === DEMO_STEPS.length - 1 ? 0 : Math.min(DEMO_STEPS.length - 1, s + 1))}>{currentStep === DEMO_STEPS.length - 1 ? 'Reiniciar' : 'Siguiente'}</button></div>
      </aside></div> : <button className="nx-demo-restart" onClick={() => { setIsTourOpen(true); }}>Reanudar demo</button>}
  </div>;
};
