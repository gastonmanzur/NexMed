import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

const WHATSAPP_NUMBER = '541122626516';
const WHATSAPP_MESSAGE = 'Hola, quiero una demo de NexMed';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const quickBenefits = [
  'Gestión centralizada de turnos',
  'Recordatorios automáticos',
  'Menos trabajo manual',
  'Mejor comunicación con pacientes'
];

export const HomePage = (): ReactElement => {
  return (
    <div className="nx-landing">
      <header className="nx-landing__header">
        <a href="#inicio" className="nx-landing__brand">NexMed</a>
        <nav className="nx-landing__nav">
          <a href="#inicio">Inicio</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#demo">Demo</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <div className="nx-landing__actions">
          <Link to="/login" className="nx-btn-secondary">Ingresar</Link>
          <Link to="/register" className="nx-btn">Registrarse</Link>
        </div>
      </header>

      <main>
        <section id="inicio" className="nx-landing__hero">
          <p className="nx-landing__eyebrow">Plataforma SaaS para salud y estética</p>
          <h1>Organizá turnos, automatizá recordatorios y mejorá la atención de tus pacientes con NexMed.</h1>
          <p>Una plataforma pensada para consultorios, clínicas y centros de estética que quieren ordenar su agenda, reducir trabajo manual y brindar una experiencia más profesional a sus pacientes.</p>
          <ul className="nx-landing__quick-benefits">
            {quickBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href="#demo">Solicitar demo</a>
            <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
            <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
            <Link className="nx-btn-secondary" to="/register">Registrarse</Link>
          </div>
        </section>

        <section className="nx-landing__section">
          <h2>Menos desorden. Más tiempo para atender mejor.</h2>
          <p>NexMed ayuda a los centros de salud y estética a organizar turnos, automatizar recordatorios y centralizar la relación con sus pacientes en un solo lugar.</p>
          <div className="nx-landing__cards nx-landing__cards--3">
            <article className="nx-landing__card"><h3>Turnos más ordenados</h3><p>Evitá depender de mensajes sueltos, agendas informales o anotaciones dispersas.</p></article>
            <article className="nx-landing__card"><h3>Menos trabajo manual</h3><p>Reducí confirmaciones repetitivas, recordatorios manuales y tareas administrativas innecesarias.</p></article>
            <article className="nx-landing__card"><h3>Mejor experiencia para el paciente</h3><p>Brindá una atención más clara, profesional y moderna desde la reserva hasta el recordatorio del turno.</p></article>
          </div>
        </section>

        <section id="como-funciona" className="nx-landing__section">
          <h2>Cómo funciona NexMed</h2>
          <div className="nx-landing__steps">
            <article className="nx-landing__card"><span>Paso 1</span><h3>Configurá tu organización</h3><p>Cargá tus profesionales, agenda, reglas semanales y disponibilidad.</p></article>
            <article className="nx-landing__card"><span>Paso 2</span><h3>Vinculá pacientes fácilmente</h3><p>Tus pacientes pueden acceder mediante link o QR y relacionarse con tu centro de forma simple.</p></article>
            <article className="nx-landing__card"><span>Paso 3</span><h3>Gestioná turnos de forma ordenada</h3><p>Permití reservas, reprogramaciones y seguimiento desde una sola plataforma.</p></article>
            <article className="nx-landing__card"><span>Paso 4</span><h3>Automatizá recordatorios y notificaciones</h3><p>Enviá avisos y mantené una mejor comunicación antes de cada turno.</p></article>
          </div>
        </section>

        <section id="beneficios" className="nx-landing__section">
          <h2>Beneficios para tu centro y para tus pacientes</h2>
          <p>Una solución pensada para mejorar la organización interna y también la experiencia de atención.</p>
          <div className="nx-landing__cards nx-landing__cards--2">
            <article className="nx-landing__card"><h3>Beneficios para consultorios, clínicas y centros de estética</h3><ul><li>Centralización de turnos y pacientes</li><li>Agenda más clara para cada profesional</li><li>Recordatorios automáticos</li><li>Menos carga administrativa</li><li>Mayor orden en la atención diaria</li><li>Mejor imagen profesional del centro</li></ul></article>
            <article className="nx-landing__card"><h3>Beneficios para pacientes</h3><ul><li>Reserva más clara y organizada</li><li>Confirmaciones automáticas</li><li>Recordatorios antes del turno</li><li>Perfil personal accesible</li><li>Mejor comunicación con el centro</li></ul></article>
          </div>
        </section>

        <section className="nx-landing__section">
          <h2>Todo lo que necesitás para organizar la atención de forma profesional</h2>
          <div className="nx-landing__cards nx-landing__cards--3">
            <article className="nx-landing__card"><h3>Agenda de profesionales</h3><p>Gestioná horarios, reglas semanales, excepciones y disponibilidad de cada profesional.</p></article>
            <article className="nx-landing__card"><h3>Recordatorios automáticos</h3><p>Reducí olvidos y mejorá la asistencia con avisos programados antes del turno.</p></article>
            <article className="nx-landing__card"><h3>Notificaciones</h3><p>Mantené informados a los pacientes con confirmaciones y novedades relevantes.</p></article>
            <article className="nx-landing__card"><h3>Perfil del paciente</h3><p>Centralizá datos útiles para que el centro tenga la información disponible cuando la necesita.</p></article>
            <article className="nx-landing__card"><h3>Gestión del centro</h3><p>Organizá profesionales, especialidades, agendas y flujo de turnos desde una sola plataforma.</p></article>
          </div>
        </section>

        <section id="demo" className="nx-landing__section nx-landing__section--highlight">
          <h2>Solicitá una demo de NexMed</h2>
          <p>Te mostramos cómo NexMed puede adaptarse al funcionamiento de tu consultorio, clínica o centro de estética.</p>
          <p>Conocé el flujo completo, resolvé dudas y evaluá cómo implementar la plataforma en tu equipo.</p>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Solicitar demo</a>
            <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
          </div>
        </section>

        <section id="contacto" className="nx-landing__section nx-landing__section--cta">
          <h2>Empezá a profesionalizar la gestión de turnos de tu centro con NexMed.</h2>
          <p>Organizá tu agenda, automatizá recordatorios y brindá una mejor experiencia a tus pacientes desde una sola plataforma.</p>
          <div className="nx-landing__cta-grid">
            <a className="nx-btn" href="#demo">Solicitar demo</a>
            <a className="nx-btn-secondary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>
            <Link className="nx-btn-secondary" to="/login">Ingresar</Link>
            <Link className="nx-btn-secondary" to="/register">Registrarse</Link>
          </div>
        </section>
      </main>

      <footer className="nx-landing__footer">
        <div><strong>NexMed</strong><p>Gestión de turnos, recordatorios y pacientes para consultorios, clínicas y centros de estética.</p></div>
        <nav>
          <a href="#inicio">Inicio</a><a href="#como-funciona">Cómo funciona</a><a href="#beneficios">Beneficios</a><a href="#demo">Demo</a><Link to="/login">Ingresar</Link><Link to="/register">Registrarse</Link>
        </nav>
        <p>WhatsApp: +54 11 2262-6516</p>
      </footer>
    </div>
  );
};
