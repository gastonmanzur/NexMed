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

const useCases = ['Consultorios', 'Clínicas', 'Centros de estética', 'Equipos con varios profesionales', 'Turnos y recordatorios'];

const showcaseItems = [
  { title: 'Agenda profesional', text: 'Vista clara por profesional, sede y especialidad para ordenar cada jornada.', image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Reserva de turnos', text: 'Reservas y reprogramaciones en segundos para reducir fricción y mejorar conversión.', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Recordatorios automáticos', text: 'Mensajes previos al turno para bajar ausencias y mejorar puntualidad.', image: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Perfil del paciente', text: 'Historial y datos organizados para una atención más rápida y profesional.', image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80' }
];

export const HomePage = (): ReactElement => {
  const [theme, setTheme] = useState<LandingTheme>(resolveInitialTheme);
  const isDarkMode = theme === 'dark';
  useEffect(() => { window.localStorage.setItem(LANDING_THEME_KEY, theme); }, [theme]);

  return (
    <div className="nx-landing" data-theme={theme}>
      <header className="nx-landing__header">
        <a href="#inicio" className="nx-landing__brand">NexMed</a>
        <nav className="nx-landing__nav">
          <a href="#como-funciona">Cómo funciona</a><a href="#beneficios">Beneficios</a><a href="#demo">Demo</a>
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
        <section id="inicio" className="nx-landing__hero nx-landing__hero-grid">
          <div>
            <p className="nx-landing__eyebrow">NexMed para salud y estética</p>
            <h1>La forma premium de gestionar turnos, pacientes y comunicación en tu centro.</h1>
            <p>Diseñado para consultorios, clínicas y centros de estética que quieren orden, automatización y una experiencia moderna para el paciente.</p>
            <div className="nx-landing__cta-grid">
              <a className="nx-btn" href="#demo">Solicitar demo</a>
              <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
              <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
            </div>
          </div>
          <div className="nx-hero-visual">
            <img src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=1400&q=80" alt="Consultorio moderno usando software de gestión" />
            <div className="nx-hero-visual__panel">
              <h3>Panel en tiempo real</h3><p>Agenda, confirmaciones y recordatorios automáticos desde un solo lugar.</p>
            </div>
          </div>
        </section>

        <section className="nx-landing__section nx-landing__trust-strip">
          {useCases.map((item) => <span key={item}>{item}</span>)}
        </section>

        <section className="nx-landing__section">
          <h2>Menos desorden operativo. Más foco en atender.</h2>
          <div className="nx-landing__cards nx-landing__cards--3">
            <article className="nx-landing__card"><h3>Menos trabajo manual</h3><p>Automatizá recordatorios y evitá seguimiento por chat uno a uno.</p></article>
            <article className="nx-landing__card"><h3>Más organización diaria</h3><p>Centralizá agenda, equipo y pacientes con visibilidad completa.</p></article>
            <article className="nx-landing__card"><h3>Mejor experiencia del paciente</h3><p>Turnos claros, notificaciones y una comunicación más profesional.</p></article>
          </div>
        </section>

        <section className="nx-landing__section">
          <h2>Showcase de funcionalidades clave</h2>
          <div className="nx-showcase-grid">
            {showcaseItems.map((item) => (
              <article key={item.title} className="nx-showcase-card">
                <img src={item.image} alt={item.title} />
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="nx-landing__section">
          <h2>Cómo funciona</h2>
          <div className="nx-landing__steps">
            <article className="nx-landing__card"><span>Paso 1</span><h3>Configurar centro y equipo</h3><p>Definí profesionales, horarios y servicios.</p></article>
            <article className="nx-landing__card"><span>Paso 2</span><h3>Activar reservas</h3><p>Habilitá solicitudes con flujo simple para el paciente.</p></article>
            <article className="nx-landing__card"><span>Paso 3</span><h3>Automatizar recordatorios</h3><p>Reducí ausencias con notificaciones previas.</p></article>
            <article className="nx-landing__card"><span>Paso 4</span><h3>Medir y optimizar</h3><p>Tomá decisiones con información centralizada.</p></article>
          </div>
        </section>

        <section id="beneficios" className="nx-landing__section nx-landing__split-benefits">
          <article className="nx-landing__card"><h3>Para el centro</h3><ul><li>Agenda profesional por equipo</li><li>Menos carga administrativa</li><li>Mejor imagen comercial</li><li>Mayor eficiencia operativa</li></ul></article>
          <article className="nx-landing__card"><h3>Para el paciente</h3><ul><li>Reserva más rápida</li><li>Recordatorios automáticos</li><li>Información clara del turno</li><li>Atención más fluida</li></ul></article>
        </section>

        <section id="demo" className="nx-landing__section nx-landing__section--highlight">
          <h2>Solicitá una demo y mirá NexMed en acción</h2>
          <p>Te mostramos el flujo completo para tu consultorio, clínica o centro de estética.</p>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Solicitar demo</a>
            <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
          </div>
        </section>

        <section className="nx-landing__section nx-landing__section--cta">
          <h2>¿Listo para vender mejor tu atención y organizar tu operación?</h2>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href="#demo">Solicitar demo</a>
            <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a>
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
