import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

const WHATSAPP_NUMBER = '541122626516';
const WHATSAPP_MESSAGE = 'Hola, quiero una demo de NexMed';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

type LandingTheme = 'dark' | 'light';
const LANDING_THEME_KEY = 'nexmed-landing-theme';

const resolveInitialTheme = (): LandingTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(LANDING_THEME_KEY) === 'light' ? 'light' : 'dark';
};

const quickFeatures = [
  { icon: '📅', title: 'Agenda profesional', text: 'Turnos por profesional, sede y servicio con una vista clara de toda la operación.' },
  { icon: '🔔', title: 'Recordatorios automáticos', text: 'Confirmaciones y avisos que reducen ausencias sin sumar trabajo manual.' },
  { icon: '✨', title: 'Experiencia premium', text: 'Desde la reserva hasta la atención, todo se siente ordenado y profesional.' }
];

const moduleCards = [
  { title: 'Agenda', text: 'Calendario inteligente por equipo y sucursal.', image: 'https://images.unsplash.com/photo-1631815588090-d1bcbe9a42e0?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Profesionales', text: 'Roles, disponibilidad y carga balanceada.', image: 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Pacientes', text: 'Historial centralizado y comunicación fluida.', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Notificaciones', text: 'Mensajes clave en cada etapa del turno.', image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Recordatorios', text: 'Automatizaciones por WhatsApp y email.', image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1400&q=80' },
  { title: 'Organización del centro', text: 'Métricas y control para decisiones más rápidas.', image: 'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?auto=format&fit=crop&w=1400&q=80' }
];

export const HomePage = (): ReactElement => {
  const [theme, setTheme] = useState<LandingTheme>(resolveInitialTheme);
  const isDarkMode = theme === 'dark';

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
          <img className="nx-landing__hero-bg" src="https://images.unsplash.com/photo-1666214279911-6f15d4eb96a4?auto=format&fit=crop&w=2200&q=80" alt="Centro médico moderno con atención profesional" />
          <div className="nx-landing__hero-overlay" />
          <div className="nx-landing__hero-content">
            <p className="nx-landing__eyebrow">NexMed | Gestión premium para salud y estética</p>
            <h1>La plataforma que ordena tu centro y mejora cada experiencia de atención.</h1>
            <p>Hecha para consultorios, clínicas y centros de estética que buscan una imagen moderna, más eficiencia operativa y mejor vínculo con pacientes.</p>
            <div className="nx-landing__cta-grid">
              <a className="nx-btn" href="#contacto">Solicitar demo</a>
              <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
              <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
              <Link className="nx-btn-secondary" to="/register">Registrarse</Link>
            </div>
          </div>
        </section>

        <section className="nx-landing__section">
          <div className="nx-landing__cards nx-landing__cards--3">
            {quickFeatures.map((item) => (
              <article key={item.title} className="nx-landing__card nx-feature-card">
                <span>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="nx-landing__section nx-landing__alt-grid">
          <img src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1500&q=80" alt="Recepción de clínica con equipo coordinado" />
          <div>
            <h2>Del caos operativo a una gestión centralizada.</h2>
            <p>NexMed reúne agenda, pacientes, profesionales y notificaciones en una experiencia simple, elegante y lista para escalar con tu centro.</p>
          </div>
        </section>

        <section className="nx-landing__section nx-landing__alt-grid nx-landing__alt-grid--reverse">
          <img src="https://images.unsplash.com/photo-1576671414121-aa0c81c86939?auto=format&fit=crop&w=1500&q=80" alt="Profesional de salud revisando agenda digital" />
          <div>
            <h2>Cómo funciona en 4 pasos.</h2>
            <div className="nx-landing__steps">
              <article className="nx-landing__card"><span>Paso 1</span><h3>Configurar tu centro</h3><p>Servicios, horarios, profesionales y reglas en minutos.</p></article>
              <article className="nx-landing__card"><span>Paso 2</span><h3>Activar reservas</h3><p>Turnos online con flujo claro para cada paciente.</p></article>
              <article className="nx-landing__card"><span>Paso 3</span><h3>Automatizar mensajes</h3><p>Recordatorios y avisos previos sin carga administrativa.</p></article>
              <article className="nx-landing__card"><span>Paso 4</span><h3>Optimizar resultados</h3><p>Medí desempeño y ajustá tu operación con datos.</p></article>
            </div>
          </div>
        </section>

        <section id="modulos" className="nx-landing__section">
          <h2>Showcase de módulos NexMed</h2>
          <div className="nx-showcase-grid">
            {moduleCards.map((item) => (
              <article key={item.title} className="nx-showcase-card">
                <img src={item.image} alt={item.title} />
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section id="beneficios" className="nx-landing__section nx-landing__split-benefits">
          <article className="nx-landing__card"><h3>Beneficios para el centro</h3><ul><li>Menos ausencias y más confirmaciones</li><li>Mejor ocupación de agenda</li><li>Procesos internos más ordenados</li><li>Imagen de marca más profesional</li></ul></article>
          <article className="nx-landing__card"><h3>Beneficios para pacientes</h3><ul><li>Reserva simple desde celular</li><li>Recordatorios claros y a tiempo</li><li>Menos fricción para reprogramar</li><li>Atención más fluida y confiable</li></ul></article>
        </section>

        <section className="nx-landing__section">
          <h2>Testimonios</h2>
          <div className="nx-landing__cards nx-landing__cards--3">
            <article className="nx-landing__card"><p>“Pasamos de gestionar por chat a operar con una agenda profesional. Hoy el equipo trabaja mucho más coordinado.”</p><strong>Directora · Centro estético, CABA</strong></article>
            <article className="nx-landing__card"><p>“Los recordatorios automáticos bajaron ausencias y mejoraron la puntualidad de los turnos.”</p><strong>Coordinación · Clínica ambulatoria</strong></article>
            <article className="nx-landing__card"><p>“La experiencia de reserva es clara y rápida. Nuestros pacientes lo notaron desde la primera semana.”</p><strong>Administración · Consultorio multidisciplinario</strong></article>
          </div>
        </section>

        <section id="faq" className="nx-landing__section">
          <h2>Preguntas frecuentes</h2>
          <div className="nx-faq-grid">
            <article className="nx-landing__card"><h3>¿NexMed sirve para centros pequeños?</h3><p>Sí. Podés empezar con uno o pocos profesionales y crecer sin migraciones complejas.</p></article>
            <article className="nx-landing__card"><h3>¿Incluye recordatorios automáticos?</h3><p>Sí, para ayudar a reducir inasistencias y mejorar la organización de cada jornada.</p></article>
            <article className="nx-landing__card"><h3>¿Se adapta a clínicas y estética?</h3><p>Exactamente: está diseñado para consultorios, clínicas y centros de estética.</p></article>
            <article className="nx-landing__card"><h3>¿Puedo ver una demo antes de contratar?</h3><p>Sí. Podemos mostrarte un flujo real aplicado a tu tipo de centro.</p></article>
          </div>
        </section>

        <section id="contacto" className="nx-landing__section nx-landing__section--cta">
          <h2>Solicitá una demo y elevá la experiencia de tu centro.</h2>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Solicitar demo</a>
            <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
            <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
            <Link className="nx-btn-secondary" to="/register">Registrarse</Link>
          </div>
        </section>
      </main>

      <footer className="nx-landing__footer">
        <div><strong>NexMed</strong><p>Plataforma para consultorios, clínicas y centros de estética.</p></div>
      </footer>
    </div>
  );
};
