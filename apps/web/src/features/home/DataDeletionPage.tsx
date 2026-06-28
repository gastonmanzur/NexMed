import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

const requestSteps = [
  'Iniciá sesión en NexMed.',
  'Ingresá en Mi cuenta.',
  'Abrí la sección Privacidad y datos.',
  'Seleccioná Solicitar eliminación de datos.',
  'Revisá el alcance de la solicitud y confirmá la operación.'
];

const supportDetails = [
  'nombre y apellido',
  'dirección de correo asociada con la cuenta',
  'teléfono asociado, cuando corresponda',
  'nombre del centro médico u organización vinculada',
  'motivo por el que no podés ingresar'
];

const includedData = [
  'datos del perfil',
  'nombre, correo electrónico y teléfono',
  'imagen de perfil',
  'sesiones y credenciales de acceso',
  'tokens de notificaciones',
  'preferencias personales',
  'vinculaciones con organizaciones',
  'datos asociados con proveedores externos de autenticación',
  'otros datos personales cuyo responsable sea NexMed'
];

const requestStatuses = ['pendiente', 'en verificación', 'en proceso', 'completada', 'rechazada', 'cancelada'];

export const DataDeletionPage = (): ReactElement => {
  return (
    <div className="nx-legal-page">
      <header className="nx-legal-page__header">
        <Link to="/" className="nx-legal-page__brand">NexMed</Link>
        <Link to="/login" className="nx-btn-tertiary">Ingresar</Link>
      </header>

      <main className="nx-legal-page__content">
        <section className="nx-legal-page__hero">
          <p className="nx-landing__eyebrow">Privacidad y datos</p>
          <h1>Eliminación de datos de NexMed</h1>
          <p>
            NexMed permite que sus usuarios soliciten la eliminación de los datos personales asociados
            con su cuenta.
          </p>
          <span>Última actualización: junio de 2026.</span>
        </section>

        <section className="nx-legal-page__section">
          <h2>Cómo solicitar la eliminación</h2>
          <div className="nx-legal-page__grid">
            <article className="nx-legal-page__card">
              <h3>Desde una cuenta de NexMed</h3>
              <ol>
                {requestSteps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <p>
                Una vez registrada la solicitud, recibirás un código de confirmación para consultar su estado.
              </p>
            </article>

            <article className="nx-legal-page__card">
              <h3>Si no podés acceder a tu cuenta</h3>
              <p>Podés comunicarte con el correo de privacidad o soporte publicado por NexMed.</p>
              <p>En el mensaje deberás indicar:</p>
              <ul>
                {supportDetails.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
              <p>
                NexMed podrá solicitar información adicional para verificar tu identidad antes de procesar la eliminación.
              </p>
            </article>
          </div>
        </section>

        <section className="nx-legal-page__section">
          <h2>Datos incluidos en la solicitud</h2>
          <p>
            Según el tipo de cuenta y el vínculo con las organizaciones, la eliminación puede comprender:
          </p>
          <ul className="nx-legal-page__columns">
            {includedData.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="nx-legal-page__section">
          <h2>Información que puede conservarse</h2>
          <p>
            Determinada información podría no eliminarse inmediatamente cuando exista una obligación legal,
            regulatoria, contractual, contable, de seguridad, prevención de fraude, auditoría o integridad de registros.
          </p>
          <p>
            Cuando corresponda, esa información podrá ser restringida, desvinculada de la cuenta o anonimizada.
          </p>
          <p>
            La eliminación de la cuenta personal de un usuario no implica automáticamente la eliminación de una clínica,
            consultorio, centro de estética u organización completa.
          </p>
          <p>
            Los propietarios de organizaciones deberán solicitar por separado el cierre de la organización y completar
            previamente cualquier proceso administrativo, contractual o de exportación de información aplicable.
          </p>
        </section>

        <section className="nx-legal-page__section">
          <h2>Estado de la solicitud</h2>
          <p>El código de confirmación permite consultar si la solicitud se encuentra:</p>
          <ul className="nx-legal-page__status-list">
            {requestStatuses.map((status) => <li key={status}>{status}</li>)}
          </ul>
          <p>La página pública de estado no muestra nombres, correos, teléfonos ni otra información personal.</p>
        </section>

        <section className="nx-legal-page__section nx-legal-page__section--cta">
          <h2>Consultas</h2>
          <p>
            Para consultas relacionadas con privacidad y eliminación de datos, utilizá el correo de privacidad publicado
            por NexMed.
          </p>
        </section>
      </main>
    </div>
  );
};
