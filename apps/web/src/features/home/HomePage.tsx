import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';


type LandingTheme = 'dark' | 'light';
const LANDING_THEME_KEY = 'nexmed-landing-theme';

const HERO_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1666214279911-6f15d4eb96a4?auto=format&fit=crop&w=2200&q=80';
const HERO_VIDEO_MP4_SRC = '/media/landing/nexmed-hero-placeholder.mp4';
const HERO_VIDEO_WEBM_SRC = '/media/landing/nexmed-hero-placeholder.webm';
// TODO(landing-hero-card-image): Reemplazar por asset final aprobado por diseño cuando esté disponible.
const FIRST_CARD_TEAMWORK_IMAGE = 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=1500&q=80';

const resolveInitialTheme = (): LandingTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(LANDING_THEME_KEY) === 'light' ? 'light' : 'dark';
};

const fallbackContent: any = { hero: { eyebrow: 'NexMed | Gestión premium para salud y estética', title: 'La plataforma que ordena tu centro y mejora cada experiencia de atención.', subtitle: 'Hecha para consultorios, clínicas y centros de estética que buscan una imagen moderna, más eficiencia operativa y mejor vínculo con pacientes.', media: { url: HERO_FALLBACK_IMAGE }, ctas: { demo: { label: 'Solicitar demo', href: '#contacto', visible: true }, whatsapp: { label: 'Hablar por WhatsApp', visible: true }, login: { label: 'Ingresar', href: '/login', visible: true }, register: { label: 'Registrarse', href: '/register', visible: true } }, whatsapp: { number: '541122626516', message: 'Hola, quiero una demo de NexMed' } }, features: [] };

// TODO(landing-images): Reemplazar estas fotos provisorias por producción final de marca.
const quickFeatures = [
  { icon: '📅', title: 'Agenda profesional', text: 'Turnos por profesional, sede y servicio con una vista clara de toda la operación.', image: 'https://canva.link/akfy3xgkcn237j7' },
  { icon: '🔔', title: 'Recordatorios automáticos', text: 'Confirmaciones y avisos que reducen ausencias sin sumar trabajo manual.', image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1600&q=80' },
  { icon: '✨', title: 'Experiencia premium', text: 'Desde la reserva hasta la atención, todo se siente ordenado y profesional.', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80' }
];

const moduleCards = [
  { title: 'Agenda', text: 'Calendario inteligente por equipo y sucursal.', image: 'https://images.unsplash.com/photo-1631815588090-d1bcbe9a42e0?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Profesionales', text: 'Roles, disponibilidad y carga balanceada.', image: 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Pacientes', text: 'Historial centralizado y comunicación fluida.', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Notificaciones', text: 'Mensajes clave en cada etapa del turno.', image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Recordatorios', text: 'Automatizaciones por la propia App.', image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Organización del centro', text: 'Métricas y control para decisiones más rápidas.', image: 'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?auto=format&fit=crop&w=1400&q=80' }
];

const howItWorksSteps = [
  { step: 'Paso 1', title: 'Configurar tu centro', text: 'Servicios, horarios, profesionales y reglas en minutos.', image: 'https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=1600&q=80' },
  { step: 'Paso 2', title: 'Activar reservas', text: 'Turnos online con flujo claro para cada paciente.', image: 'https://images.unsplash.com/photo-1612277795421-9bc7706a4a34?auto=format&fit=crop&w=1600&q=80' },
  { step: 'Paso 3', title: 'Automatizar mensajes', text: 'Recordatorios y avisos previos sin carga administrativa.', image: 'https://images.unsplash.com/photo-1584516150909-c43483ee7938?auto=format&fit=crop&w=1600&q=80' },
  { step: 'Paso 4', title: 'Optimizar resultados', text: 'Medí desempeño y ajustá tu operación con datos.', image: 'https://images.unsplash.com/photo-1638202993928-7d1134b8402e?auto=format&fit=crop&w=1600&q=80' }
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
          <Link to="/login" className="nx-btn-secondary">Ingresar</Link>
          <Link to="/register" className="nx-btn">Registrarse</Link>
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
            <h1>{content.hero?.title}</h1>
            <p>{content.hero?.subtitle}</p>
            <div className="nx-landing__cta-grid">
              <a className="nx-btn" href="#contacto">Solicitar demo</a>
              <a className="nx-btn-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
              <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
              <Link className="nx-btn-secondary" to="/register">Registrarse</Link>
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
            <p>NexMed reúne agenda, pacientes, profesionales y notificaciones en una experiencia simple, elegante y lista para escalar con tu centro.</p>
          </div>
        </section>

        <section className="nx-landing__section nx-landing__alt-grid nx-landing__alt-grid--reverse">
          <img src="https://images.unsplash.com/photo-1631815588090-d1bcbe9a42e0?auto=format&fit=crop&w=1600&q=80" alt="Equipo médico revisando agenda digital en consultorio moderno" />
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
        </section>

        <section id="modulos" className="nx-landing__section">
          <h2>{content.modules?.title || "Showcase de módulos NexMed"}</h2><p>{content.modules?.subtitle}</p>
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
            <img src="https://images.unsplash.com/photo-1643297654416-05743e808056?auto=format&fit=crop&w=1600&q=80" alt="Recepción de clínica organizada revisando agenda en computadora" loading="lazy" />
            <h3>{content.benefits?.centerTitle || "Beneficios para el centro"}</h3><ul>{(content.benefits?.centerItems?.length ? content.benefits.centerItems : ["Menos ausencias y más confirmaciones","Mejor ocupación de agenda","Procesos internos más ordenados","Imagen de marca más profesional"]).map((item:string)=><li key={item}>{item}</li>)}</ul>
          </article>
          <article className="nx-landing__card nx-benefit-card">
            <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80" alt="Paciente usando el celular para gestionar turnos y recordatorios" loading="lazy" />
            <h3>{content.benefits?.patientTitle || "Beneficios para pacientes"}</h3><ul>{(content.benefits?.patientItems?.length ? content.benefits.patientItems : ["Reserva simple desde celular","Recordatorios claros y a tiempo","Menos fricción para reprogramar","Atención más fluida y confiable"]).map((item:string)=><li key={item}>{item}</li>)}</ul>
          </article>
        </section>

        <section className="nx-landing__section">
          <h2>Testimonios</h2>
          <div className="nx-landing__cards nx-landing__cards--3">{(content.testimonials?.length ? content.testimonials.filter((i:any)=>i.visible!==false) : [{text:"Pasamos de gestionar por chat a operar con una agenda profesional.",name:"Directora",role:"Centro estético"}]).map((item:any, idx:number)=><article key={idx} className="nx-landing__card"><p>“{item.text}”</p><strong>{item.name} · {item.role}</strong></article>)}</div>
        </section>

        <section id="faq" className="nx-landing__section">
          <h2>Preguntas frecuentes</h2>
          <div className="nx-faq-grid">{(content.faq?.length ? content.faq.filter((i:any)=>i.visible!==false).sort((a:any,b:any)=>(a.order??0)-(b.order??0)) : [{question:"¿NexMed sirve para centros pequeños?",answer:"Sí. Podés empezar con uno o pocos profesionales."}]).map((item:any, idx:number)=><article key={idx} className="nx-landing__card"><h3>{item.question}</h3><p>{item.answer}</p></article>)}</div>
        </section>

        <section id="contacto" className="nx-landing__section nx-landing__section--cta">
          <h2>{content.finalCta?.title || "Solicitá una demo y elevá la experiencia de tu centro."}</h2><p>{content.finalCta?.subtitle}</p>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href={whatsappUrl} target="_blank" rel="noreferrer">Solicitar demo</a>
            <a className="nx-btn-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
            <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
            <Link className="nx-btn-secondary" to="/register">Registrarse</Link>
          </div>
        </section>
      </main>

      <footer className="nx-landing__footer">
        <div><strong>NexMed</strong><p>{content.footer?.brandText || "Plataforma para consultorios, clínicas y centros de estética."}</p></div>
      </footer>
    </div>
  );
};
