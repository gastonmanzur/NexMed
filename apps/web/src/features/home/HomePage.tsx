import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';


type LandingTheme = 'dark' | 'light';
const LANDING_THEME_KEY = 'nexmed-landing-theme';

const HERO_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1666214279911-6f15d4eb96a4?auto=format&fit=crop&w=2200&q=80';
const HERO_VIDEO_MP4_SRC = '/media/landing/nexmed-hero-placeholder.mp4';
const HERO_VIDEO_WEBM_SRC = '/media/landing/nexmed-hero-placeholder.webm';
// Reemplazo estricto de imágenes de landing (orden provisto por cliente):
// 1) Recordatorios automáticos
// 2) Del caos operativo a una gestión centralizada
// 3) Configurar tu centro
// 4) Activar reservas
// 5) Automatizar mensajes
// 6) Optimizar resultados



const LANDING_IMAGE_AGENDA_PROFECIONAL = '/media/landing/Agenda-profecional.png';
const LANDING_IMAGE_RECORDATORIOS_AUTOMATICOS = '/media/landing/recordatorios.png';
const LANDING_IMAGE_CHAOS_A_CENTRALIZADA = '/media/landing/del-caos-al-orden.png';
const LANDING_IMAGE_CONFIGURAR_CENTRO = '/media/landing/configurar-centro.png';
const LANDING_IMAGE_ACTIVAR_RESERVAS = '/media/landing/Activar-reserva.png';
const LANDING_IMAGE_AUTOMATIZAR_MENSAJES = '/media/landing/Automatizar-mensajes.png';
const LANDING_IMAGE_OPTIMIZAR_RESULTADOS = '/media/landing/Optimisar-rendimientos.png';
// const LANDING_IMAGE_EQUIPO_MEDICO = '/media/landing/Equipo-medico.png';
const LANDING_IMAGE_AGENDA = '/media/landing/Agenda-inteligente.png';
const LANDING_IMAGE_PACIENTES = '/media/landing/Pacientes.png';
const LANDING_IMAGE_NOTIFICACIONES = '/media/landing/Notificaciones.png';
const LANDING_IMAGE_RECORDATORIOS = '/media/landing/Recordatorios-2.png';
const LANDING_IMAGE_ORGANIZACION_DEL_CENTRO = '/media/landing/Organizacion-del-centro.png';
const LANDING_IMAGE_BENEFICIOS_PARA_EL_CENTRO = '/media/landing/Beneficios_centro.png';
const LANDING_IMAGE_BENEFICIOS_PARA_LOS_PACIENTES = '/media/landing/Beneficios-pacientes.png';


// TODO(landing-hero-card-image): Reemplazar por asset final aprobado por diseño cuando esté disponible.
const FIRST_CARD_TEAMWORK_IMAGE = LANDING_IMAGE_CHAOS_A_CENTRALIZADA;

const resolveInitialTheme = (): LandingTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(LANDING_THEME_KEY) === 'light' ? 'light' : 'dark';
};

const fallbackContent: any = { hero: { eyebrow: 'NexMed | Agenda, turnos y pacientes para centros de salud y estética', title: 'Organizá turnos, automatizá recordatorios y ordená la agenda de tu centro en un solo sistema.', subtitle: 'NexMed te ayuda a reducir trabajo manual en recepción y a sostener una atención más clara para pacientes y equipo.', media: { url: HERO_FALLBACK_IMAGE }, ctas: { demo: { label: 'Solicitar demo', href: '#contacto', visible: true }, whatsapp: { label: 'Hablar por WhatsApp', visible: true }, login: { label: 'Ingresar', href: '/login', visible: true }, register: { label: 'Registrarse', href: '/register', visible: true } }, whatsapp: { number: '541122626516', message: 'Hola, quiero una demo de NexMed' } }, features: [] };

// TODO(landing-images): Reemplazar estas fotos provisorias por producción final de marca.
const quickFeatures = [

  { icon: '📅', title: 'Agenda profesional', text: 'Visualizá turnos por profesional, sede y servicio con menos cruces y menos desorden.', image: LANDING_IMAGE_AGENDA_PROFECIONAL },
  { icon: '🔔', title: 'Recordatorios automáticos', text: 'Programá avisos y confirmaciones para reducir ausencias sin aumentar carga administrativa.', image: LANDING_IMAGE_RECORDATORIOS_AUTOMATICOS },
  { icon: '👥', title: 'Gestión de pacientes', text: 'Centralizá perfiles y seguimiento para sostener una atención más consistente.', image: LANDING_IMAGE_PACIENTES }
];

const moduleCards = [
  { title: 'Agenda', text: 'Vista de turnos por día, profesional y sede para ordenar la operación diaria.', image: LANDING_IMAGE_AGENDA },
  { title: 'Profesionales', text: 'Configurá disponibilidad del equipo y distribuí mejor la carga de atención.', image: LANDING_IMAGE_EQUIPO_MEDICO },
  { title: 'Pacientes', text: 'Perfiles centralizados con información útil para seguimiento y atención.', image: LANDING_IMAGE_PACIENTES },
  { title: 'Notificaciones', text: 'Avisos sobre cambios y acciones relevantes para el paciente.', image: LANDING_IMAGE_NOTIFICACIONES },
  { title: 'Recordatorios', text: 'Reglas de recordatorio automáticas para confirmar turnos con anticipación.', image: LANDING_IMAGE_RECORDATORIOS },
  { title: 'Organización del centro', text: 'Panel operativo para controlar agenda, equipos y tareas del centro.', image: LANDING_IMAGE_ORGANIZACION_DEL_CENTRO }
];

const howItWorksSteps = [
  { step: 'Paso 1', title: 'Configurar tu centro', text: 'Servicios, horarios, profesionales y reglas en minutos.', image: LANDING_IMAGE_CONFIGURAR_CENTRO },
  { step: 'Paso 2', title: 'Activar reservas', text: 'Turnos online con flujo claro para cada paciente.', image: LANDING_IMAGE_ACTIVAR_RESERVAS },
  { step: 'Paso 3', title: 'Automatizar mensajes', text: 'Recordatorios y avisos previos sin carga administrativa.', image: LANDING_IMAGE_AUTOMATIZAR_MENSAJES },
  { step: 'Paso 4', title: 'Ajustar la operación', text: 'Revisá agenda y atención diaria para mejorar la coordinación del centro.', image: LANDING_IMAGE_OPTIMIZAR_RESULTADOS }
];

export const HomePage = (): ReactElement => {
  const [theme, setTheme] = useState<LandingTheme>(resolveInitialTheme);
  const [heroVideoUnavailable, setHeroVideoUnavailable] = useState(false);
  const [content, setContent] = useState<any>(fallbackContent);
  const isDarkMode = theme === 'dark';
  const whatsappUrl = useMemo(() => `https://wa.me/${content.hero?.whatsapp?.number ?? '541122626516'}?text=${encodeURIComponent(content.hero?.whatsapp?.message ?? '')}`, [content]);

  useEffect(() => {
    window.localStorage.setItem(LANDING_THEME_KEY, theme);
  }, [theme]);


  return (
    <div className="nx-landing" data-theme={theme}>
      <header className="nx-landing__header">
        <a href="#inicio" className="nx-landing__brand">NexMed</a>
        <nav className="nx-landing__nav">
          <a href="#modulos">Módulos</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#faq">FAQ</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <div className="nx-landing__actions">
          <button type="button" className="nx-theme-toggle" onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}>
            <span className="nx-theme-toggle__icon" aria-hidden="true">{isDarkMode ? '🌙' : '☀️'}</span>
            <span className="nx-theme-toggle__label">{isDarkMode ? 'Modo oscuro' : 'Modo claro'}</span>
          </button>
          <Link to="/login" className="nx-btn-tertiary">Ingresar</Link>
          <Link to="/register" className="nx-btn-tertiary">Registrarse</Link>
        </div>
      </header>

      <main>
        <section id="inicio" className="nx-landing__hero">
          {!heroVideoUnavailable ? (
            <video
              className="nx-landing__hero-bg nx-landing__hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={HERO_FALLBACK_IMAGE}
              aria-hidden="true"
              onError={() => setHeroVideoUnavailable(true)}
            >
              <source src={HERO_VIDEO_WEBM_SRC} type="video/webm" />
              <source src={HERO_VIDEO_MP4_SRC} type="video/mp4" />
            </video>
          ) : null}
          <img
            className={`nx-landing__hero-bg nx-landing__hero-fallback ${heroVideoUnavailable ? 'is-visible' : ''}`}
            src={content.hero?.media?.url || HERO_FALLBACK_IMAGE}
            alt="Centro médico moderno con atención profesional"
            loading="eager"
            fetchPriority="high"
          />
          <div className="nx-landing__hero-overlay" />
          <div className="nx-landing__hero-content">
            <p className="nx-landing__eyebrow">{content.hero?.eyebrow}</p>
            <div className="nx-landing__segment-chips" aria-label="Tipo de centro">
              <span>Consultorios</span>
              <span>Clínicas</span>
              <span>Centros de estética</span>
            </div>
            <h1>{content.hero?.title}</h1>
            <p>{content.hero?.subtitle}</p>
            <p className="nx-landing__hero-proof">Pensado para consultorios, clínicas y centros de estética que hoy gestionan turnos con WhatsApp, planillas o múltiples sistemas.</p>
            <div className="nx-landing__cta-grid">
              <a className="nx-btn" href="#contacto">Solicitar demo</a>
              <a className="nx-btn-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
              <Link className="nx-btn-tertiary" to="/login">Ingresar</Link>
              <Link className="nx-btn-tertiary" to="/register">Registrarse</Link>
            </div>
          </div>
        </section>

        <section className="nx-landing__section">
          <div className="nx-landing__cards nx-landing__cards--3">
            {(content.features?.length ? content.features.filter((i:any)=>i.visible!==false) : quickFeatures).map((item:any) => (
              <article key={item.title} className="nx-landing__card nx-feature-card">
                {'image' in item ? <img className="nx-feature-card__image" src={item.image as string} alt={item.title} loading="lazy" /> : null}
                <span>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.description ?? item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="nx-landing__section nx-landing__alt-grid">
          <img className="nx-landing__alt-grid-image nx-landing__alt-grid-image--teamwork" src={FIRST_CARD_TEAMWORK_IMAGE} alt="Secretaria en computadora mientras médico de pie señala la pantalla" />
          <div>
            <h2>Del caos operativo a una gestión centralizada.</h2>
            <p>NexMed reúne agenda, turnos, pacientes, profesionales y notificaciones para que el equipo trabaje con procesos claros y menos tareas manuales.</p>
            <ul className="nx-landing__evidence-list">
              <li>Agenda profesional con vista por día, profesional y sede.</li>
              <li>Reservas y reprogramaciones con flujo claro para recepción y pacientes.</li>
              <li>Recordatorios y notificaciones automáticas configurables por el centro.</li>
              <li>Gestión de pacientes centralizada para sostener continuidad en la atención.</li>
            </ul>
          </div>
        </section>

        {/* <section className="nx-landing__section nx-landing__alt-grid nx-landing__alt-grid--reverse">
          <img src= {LANDING_IMAGE_EQUIPO_MEDICO} alt="Equipo médico revisando agenda digital en consultorio moderno" />
          <div>
            <h2>Cómo funciona en 4 pasos.</h2>
            <div className="nx-landing__steps">
              {howItWorksSteps.map((step) => (
                <article key={step.title} className="nx-landing__card nx-step-card">
                  <img className="nx-step-card__image" src={step.image} alt={step.title} loading="lazy" />
                  <span>{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section> */}

        <section id="modulos" className="nx-landing__section">
          <h2>{content.modules?.title || "Módulos que hoy ya podés usar en NexMed"}</h2><p>{content.modules?.subtitle || "Cada bloque está pensado para resolver una parte operativa concreta de tu centro, sin promesas infladas."}</p>
          <div className="nx-showcase-grid">
            {(content.modules?.cards?.length ? content.modules.cards.filter((i:any)=>i.visible!==false) : moduleCards).map((item:any) => (
              <article key={item.title} className="nx-showcase-card">
                <img src={item.media?.url || item.image} alt={item.title} />
                <div><h3>{item.title}</h3><p>{item.description ?? item.text}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section id="beneficios" className="nx-landing__section nx-landing__split-benefits">
          <article className="nx-landing__card nx-benefit-card">
            <img src={LANDING_IMAGE_BENEFICIOS_PARA_EL_CENTRO} alt="Recepción de clínica organizada revisando agenda en computadora" loading="lazy" />
            <h3>{content.benefits?.centerTitle || "Beneficios para el centro"}</h3><ul>{(content.benefits?.centerItems?.length ? content.benefits.centerItems : ["Menos ausencias y más confirmaciones","Mejor ocupación de agenda","Procesos internos más ordenados","Imagen de marca más profesional"]).map((item:string)=><li key={item}>{item}</li>)}</ul>
          </article>
          <article className="nx-landing__card nx-benefit-card">
            <img src={LANDING_IMAGE_BENEFICIOS_PARA_LOS_PACIENTES} alt="Paciente usando el celular para gestionar turnos y recordatorios" loading="lazy" />
            <h3>{content.benefits?.patientTitle || "Beneficios para pacientes"}</h3><ul>{(content.benefits?.patientItems?.length ? content.benefits.patientItems : ["Reserva simple desde celular","Recordatorios claros y a tiempo","Menos fricción para reprogramar","Atención más fluida y confiable"]).map((item:string)=><li key={item}>{item}</li>)}</ul>
          </article>
        </section>

        <section className="nx-landing__section">
          <h2>Confianza basada en uso real, no en humo</h2>
          <p className="nx-landing__section-lead">NexMed está enfocado en resolver la operación diaria de centros de salud y estética: agenda, turnos, comunicación y organización interna.</p>
          <div className="nx-landing__cards nx-landing__cards--3">
            <article className="nx-landing__card">
              <h3>Ideal para consultorios en crecimiento</h3>
              <p>Si hoy coordinás gran parte de tus turnos por chat o planillas, NexMed te ayuda a ordenar la agenda en un flujo único.</p>
            </article>
            <article className="nx-landing__card">
              <h3>Útil para clínicas con varios profesionales</h3>
              <p>Centralizá disponibilidad, turnos y comunicación para reducir cruces entre recepción, equipo médico y pacientes.</p>
            </article>
            <article className="nx-landing__card">
              <h3>Preparado para centros de estética</h3>
              <p>Organizá reservas y recordatorios con una experiencia más clara para el equipo y para cada paciente.</p>
            </article>
          </div>
        </section>

        <section id="faq" className="nx-landing__section">
          <h2>Preguntas frecuentes</h2>
          <div className="nx-faq-grid">{(content.faq?.length ? content.faq.filter((i:any)=>i.visible!==false).sort((a:any,b:any)=>(a.order??0)-(b.order??0)) : [
            {question:"¿NexMed es para consultorios pequeños?",answer:"Sí. Podés comenzar con un consultorio y luego sumar más profesionales o sedes."},
            {question:"¿Qué puede automatizar hoy NexMed?",answer:"La gestión de turnos, recordatorios y notificaciones asociadas a la atención. Si necesitás un flujo particular, lo vemos en demo."},
            {question:"¿Incluye métricas avanzadas o BI?",answer:"NexMed hoy se enfoca en panel operativo y organización diaria del centro. En demo te mostramos el alcance actual sin sobrepromesas."},
            {question:"¿Cómo pido una demo?",answer:"Podés solicitarla desde esta landing o escribir por WhatsApp para coordinar una llamada y ver el producto real."}
          ]).map((item:any, idx:number)=><article key={idx} className="nx-landing__card"><h3>{item.question}</h3><p>{item.answer}</p></article>)}</div>
        </section>

        <section id="contacto" className="nx-landing__section nx-landing__section--cta">
          <h2>{content.finalCta?.title || "Solicitá una demo de NexMed y evaluá si encaja con tu centro."}</h2><p>{content.finalCta?.subtitle || "Te mostramos agenda, turnos, recordatorios, notificaciones y gestión de pacientes con el alcance real disponible hoy."}</p>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href={whatsappUrl} target="_blank" rel="noreferrer">Solicitar demo</a>
            <a className="nx-btn-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
            <Link className="nx-btn-tertiary" to="/login">Ingresar</Link>
            <Link className="nx-btn-tertiary" to="/register">Registrarse</Link>
          </div>
        </section>
      </main>

      <footer className="nx-landing__footer">
        <div><strong>NexMed</strong><p>{content.footer?.brandText || "Plataforma para consultorios, clínicas y centros de estética."}</p></div>
      </footer>
    </div>
  );
};
