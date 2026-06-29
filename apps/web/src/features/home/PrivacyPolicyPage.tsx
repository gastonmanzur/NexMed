import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { legalConfig } from '../../config/legal';
import { applyPrivacyPolicyMetadata } from './legal-metadata';

const updatedAt = '29 de junio de 2026';
const sections = [
  ['responsable', '1. Responsable del tratamiento'],
  ['alcance', '2. Alcance'],
  ['roles', '3. NexMed y organizaciones'],
  ['datos', '4. Datos tratados'],
  ['sensibles', '5. Datos sensibles y de salud'],
  ['finalidades', '6. Finalidades'],
  ['integraciones', '7. Integraciones'],
  ['servicios', '8. Prestadores y transferencias'],
  ['conservacion', '9. Conservación y seguridad'],
  ['cookies', '10. Cookies y almacenamiento local'],
  ['derechos', '11. Derechos y eliminación'],
  ['menores', '12. Menores, cambios y autoridad'],
  ['contacto', '13. Contacto'],
] as const;

export const PrivacyPolicyPage = (): ReactElement => {
  useEffect(() => applyPrivacyPolicyMetadata(), []);
  const mailto = `mailto:${legalConfig.privacyContactEmail}`;

  return (
    <div className="nx-legal-page">
      <header className="nx-legal-page__header">
        <Link to="/" className="nx-legal-page__brand">NexMed</Link>
        <nav className="nx-legal-page__nav" aria-label="Navegación legal">
          <Link to="/data-deletion">Eliminación de datos</Link>
          <Link to="/login" className="nx-btn-tertiary">Ingresar</Link>
        </nav>
      </header>

      <main className="nx-legal-page__content nx-legal-page__content--reading">
        <section className="nx-legal-page__hero">
          <p className="nx-landing__eyebrow">Privacidad y datos personales</p>
          <h1>Política de Privacidad de NexMed</h1>
          <p>
            Esta Política explica cómo se tratan datos personales en NexMed, una plataforma multi-tenant para gestión
            de agenda, turnos, pacientes, profesionales, notificaciones e integraciones de organizaciones de salud y estética.
          </p>
          <span>Última actualización: {updatedAt}.</span>
        </section>

        <nav className="nx-legal-page__section nx-legal-page__toc" aria-labelledby="privacy-index">
          <h2 id="privacy-index">Índice</h2>
          <ol>
            {sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ol>
        </nav>

        <section id="responsable" className="nx-legal-page__section">
          <h2>1. Responsable del tratamiento</h2>
          <p><strong>Operador:</strong> {legalConfig.operatorName}.</p>
          {legalConfig.taxId ? <p><strong>Identificación fiscal:</strong> {legalConfig.taxId}.</p> : null}
          <p><strong>Domicilio:</strong> {legalConfig.address}.</p>
          <p>
            Para consultas de privacidad: <a href={mailto}>{legalConfig.privacyContactEmail}</a>. Para soporte operativo:
            {' '}<a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>.
          </p>
        </section>

        <section id="alcance" className="nx-legal-page__section">
          <h2>2. Alcance</h2>
          <p>
            Esta Política aplica a las rutas públicas y autenticadas de NexMed, a usuarios con rol de paciente,
            organización, profesional y administrador global, y a comunicaciones vinculadas con la prestación del servicio.
          </p>
          <p>No aplica a sitios, sistemas o prácticas de terceros que tengan sus propias políticas de privacidad.</p>
        </section>

        <section id="roles" className="nx-legal-page__section">
          <h2>3. NexMed y organizaciones</h2>
          <p>
            NexMed trata datos necesarios para operar la plataforma y administrar cuentas. Cuando una clínica,
            consultorio, centro de estética u otra organización carga o gestiona datos de sus pacientes y turnos,
            esa organización define el uso asistencial, administrativo o comercial lícito de esa información y debe cumplir
            sus obligaciones frente a los titulares.
          </p>
          <p>
            NexMed actúa como proveedor tecnológico respecto de muchos datos de pacientes gestionados por organizaciones,
            sin sustituir el criterio profesional ni las responsabilidades legales propias de cada organización.
          </p>
        </section>

        <section id="datos" className="nx-legal-page__section">
          <h2>4. Datos tratados</h2>
          <ul className="nx-legal-page__columns">
            <li><strong>Cuenta:</strong> nombre, apellido, email, contraseña protegida, foto, proveedor de autenticación, sesiones y roles.</li>
            <li><strong>Organizaciones:</strong> nombre, datos de contacto, configuración, miembros, especialidades, sedes y suscripciones.</li>
            <li><strong>Profesionales:</strong> identificación, disponibilidad, especialidades, invitaciones, perfil y agenda.</li>
            <li><strong>Pacientes y turnos:</strong> datos de contacto, reservas, cancelaciones, reprogramaciones, historial de atención registrado por la organización y familiares vinculados cuando corresponda.</li>
            <li><strong>Información técnica:</strong> IP, navegador, dispositivo, identificadores de sesión, eventos de seguridad, tokens de notificación y registros necesarios para auditoría y diagnóstico.</li>
          </ul>
        </section>

        <section id="sensibles" className="nx-legal-page__section">
          <h2>5. Datos sensibles y de salud</h2>
          <p>
            NexMed puede alojar datos relacionados con turnos, prestaciones, notas o antecedentes cargados por organizaciones
            y profesionales. Estos datos pueden revelar información de salud o datos sensibles. Deben cargarse sólo cuando sean
            necesarios, pertinentes y autorizados por la normativa aplicable y por la relación entre titular y organización.
          </p>
        </section>

        <section id="finalidades" className="nx-legal-page__section">
          <h2>6. Finalidades</h2>
          <p>
            Los datos se usan para crear y autenticar cuentas, operar agendas y turnos, gestionar pacientes y profesionales,
            enviar recordatorios o avisos, brindar soporte, administrar pagos y suscripciones, prevenir abuso, mantener seguridad,
            cumplir obligaciones legales y mejorar la estabilidad del servicio. NexMed no utiliza datos de WhatsApp para publicidad
            ni para crear perfiles publicitarios.
          </p>
        </section>

        <section id="integraciones" className="nx-legal-page__section">
          <h2>7. Integraciones</h2>
          <h3>Meta WhatsApp Cloud API</h3>
          <p>
            La integración actual se utiliza para WhatsApp Business. Pueden procesarse teléfonos, parámetros de plantillas,
            identificadores y estados de mensajes. Un mensaje de recordatorio o confirmación puede revelar la existencia de un turno;
            por eso las organizaciones deben minimizar contenido sensible. Meta trata determinada información bajo sus propias
            condiciones y políticas.
          </p>
          <h3>Google/Firebase</h3>
          <p>
            NexMed usa Google/Firebase para autenticación con Google y notificaciones push cuando estén configuradas. Pueden tratarse
            identificadores de usuario, email, foto de perfil, tokens técnicos y datos del dispositivo necesarios para esos servicios.
          </p>
          <h3>Mercado Pago</h3>
          <p>
            NexMed integra Mercado Pago para pagos y suscripciones. Los datos de pago se procesan en el entorno de Mercado Pago;
            NexMed conserva estados, referencias y datos administrativos necesarios para conciliación, soporte y cumplimiento.
          </p>
        </section>

        <section id="servicios" className="nx-legal-page__section">
          <h2>8. Prestadores y transferencias internacionales</h2>
          <p>
            Para operar el servicio pueden intervenir proveedores de infraestructura, autenticación, mensajería, email, pagos,
            analítica técnica, soporte y almacenamiento. Algunos proveedores pueden tratar información fuera del país del titular.
            NexMed procura usar proveedores reconocidos y limitar la información compartida a lo necesario para la prestación.
          </p>
        </section>

        <section id="conservacion" className="nx-legal-page__section">
          <h2>9. Conservación y seguridad</h2>
          <p>
            Los datos se conservan mientras exista la cuenta, la relación con la organización, una obligación legal o una necesidad
            operativa razonable. NexMed aplica controles de acceso por roles, cookies seguras en producción, validaciones, registros
            técnicos y medidas de hardening; ninguna medida elimina todos los riesgos inherentes a sistemas conectados a internet.
          </p>
        </section>

        <section id="cookies" className="nx-legal-page__section">
          <h2>10. Cookies y almacenamiento local</h2>
          <p>
            NexMed utiliza cookies o almacenamiento local para sesión, seguridad, preferencias, intención de cuenta y funcionamiento
            de la aplicación. Deshabilitarlos puede afectar el inicio de sesión o funcionalidades autenticadas.
          </p>
        </section>

        <section id="derechos" className="nx-legal-page__section">
          <h2>11. Derechos y eliminación de datos</h2>
          <p>
            Los titulares pueden solicitar acceso, rectificación, actualización, supresión u oposición cuando corresponda. Para datos
            gestionados por una organización, puede ser necesario dirigir la solicitud a esa organización. NexMed ofrece instrucciones
            públicas de eliminación en <Link to="/data-deletion">Eliminación de datos</Link>.
          </p>
        </section>

        <section id="menores" className="nx-legal-page__section">
          <h2>12. Menores, cambios y autoridad de control</h2>
          <p>
            NexMed no está orientado a que menores creen cuentas de organización por cuenta propia. Si una organización gestiona datos
            de menores, debe contar con base legal o autorización correspondiente. Esta Política puede actualizarse; la versión vigente
            se publicará en esta ruta. En Argentina, los titulares pueden acudir a la Agencia de Acceso a la Información Pública u otra
            autoridad competente según jurisdicción aplicable.
          </p>
        </section>

        <section id="contacto" className="nx-legal-page__section nx-legal-page__section--cta">
          <h2>13. Datos de contacto</h2>
          <p>
            Contacto de privacidad: <a href={mailto}>{legalConfig.privacyContactEmail}</a>. También podés volver al
            {' '}<Link to="/">inicio</Link> o consultar la <Link to="/data-deletion">página de eliminación de datos</Link>.
          </p>
        </section>
      </main>
    </div>
  );
};
