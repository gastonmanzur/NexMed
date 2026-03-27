import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18n.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'en',
  resources: {
    es: {
      translation: {
        home: {
          title: 'Starter profesional listo para escalar',
          subtitle: 'Base modular React + Express + MongoDB con TypeScript estricto.',
          switchLanguage: 'Cambiar idioma'
        },
        auth: {
          common: { goLogin: 'Ir a login' },
          register: { title: 'Registro', submit: 'Crear cuenta', success: 'Registro exitoso, revisa tu email.' },
          login: { title: 'Login', submit: 'Ingresar', google: 'Entrar con Google', forgot: '¿Olvidaste tu contraseña?' },
          verify: { title: 'Verificar email', submit: 'Verificar', success: 'Email verificado correctamente' },
          forgot: { title: 'Recuperar contraseña', submit: 'Enviar email', success: 'Si existe la cuenta, enviamos un email.' },
          reset: { title: 'Resetear contraseña', submit: 'Guardar nueva contraseña', success: 'Contraseña actualizada' },
          change: { title: 'Cambiar contraseña', current: 'Contraseña actual', new: 'Nueva contraseña', submit: 'Actualizar', success: 'Contraseña cambiada' }
        },
        payments: {
          title: 'Monetización',
          subtitle: 'Inicia pagos únicos y suscripciones con Mercado Pago, y consulta su estado real.',
          buyOneTime: 'Comprar pago único',
          refreshStatus: 'Actualizar estado',
          statusUpdated: 'Estado sincronizado desde backend/proveedor.',
          lastOrder: 'Última orden',
          currentStatus: 'Estado actual',
          unknown: 'desconocido',
          subscribeMonthly: 'Suscribirme mensual',
          subscribeYearly: 'Suscribirme anual',
          pending: 'Operación iniciada. Completa el checkout y espera confirmación por webhook.',
          refreshSubscriptionStatus: 'Actualizar estado suscripción',
          lastSubscription: 'Última suscripción',
          currentSubscriptionStatus: 'Estado suscripción',
          error: 'No se pudo iniciar la operación de pago.'
        },
        profile: {
          title: 'Perfil',
          greeting: 'Hola {{email}}',
          role: 'Rol: {{role}}',
          changePassword: 'Cambiar contraseña',
          avatar: {
            title: 'Avatar', alt: 'Avatar de usuario', empty: 'Todavía no tienes avatar.', delete: 'Eliminar avatar', uploadSuccess: 'Avatar actualizado correctamente', deleteSuccess: 'Avatar eliminado', loading: 'Procesando avatar...', invalidType: 'Selecciona una imagen válida (png, jpg o webp).', invalidSize: 'El archivo excede el tamaño máximo permitido (2 MB).', unexpectedError: 'No se pudo procesar el avatar.', googleManaged: 'La imagen de perfil se administra desde tu cuenta de Google.'
          },
          push: {
            title: 'Notificaciones push', permission: 'Permiso actual: {{status}}', status: 'Estado: {{status}}', active: 'activo', inactive: 'inactivo', enable: 'Activar push web', disable: 'Desactivar en este navegador', sendTest: 'Enviar prueba', enabled: 'Push web activado correctamente.', disabled: 'Push web desactivado para este navegador.', disableNeedsToken: 'No hay token local registrado para desactivar.', testTitle: 'Prueba de notificación', testBody: 'Esta es una notificación de prueba.', testResult: 'Enviadas: {{sent}} | fallidas: {{failed}}', error: 'No se pudo actualizar el estado de push web.'
          }
        },
        admin: {
          title: 'Panel de administración',
          navigation: { dashboard: 'Dashboard', users: 'Usuarios', payments: 'Pagos', subscriptions: 'Suscripciones', notifications: 'Notificaciones', avatars: 'Avatares', monetization: 'Monetización' },
          common: { loading: 'Cargando...', loadError: 'No se pudo cargar la sección.', actionError: 'No se pudo completar la acción.', yes: 'Sí', no: 'No' },
          dashboard: { totalUsers: 'Usuarios totales', adminUsers: 'Admins', payments: 'Pagos', subscriptions: 'Suscripciones', pushDevices: 'Dispositivos push', usersWithAvatar: 'Usuarios con avatar' },
          users: { email: 'Email', role: 'Rol', provider: 'Proveedor', verified: 'Verificado', actions: 'Acciones', toggleRole: 'Cambiar rol', roleUpdated: 'Rol actualizado' },
          payments: { user: 'Usuario', type: 'Tipo', status: 'Estado', amount: 'Monto' },
          subscriptions: { user: 'Usuario', period: 'Periodicidad', status: 'Estado', externalReference: 'Referencia externa' },
          notifications: { targetUserPlaceholder: 'ID de usuario destino', titlePlaceholder: 'Título', bodyPlaceholder: 'Mensaje', submit: 'Enviar notificación', success: 'Notificación enviada', error: 'No se pudo enviar la notificación' },
          avatars: { user: 'Usuario', avatar: 'Avatar', actions: 'Acciones', imageAlt: 'Avatar de usuario', noAvatar: 'Sin avatar', delete: 'Eliminar avatar', deleted: 'Avatar eliminado' },
          monetization: { mode: 'Modalidad', periodMode: 'Periodicidad permitida', save: 'Guardar configuración', updated: 'Configuración actualizada' }
        }
      }
    },
    en: {
      translation: {
        home: {
          title: 'Professional starter ready to scale',
          subtitle: 'Modular React + Express + MongoDB baseline with strict TypeScript.',
          switchLanguage: 'Switch language'
        },
        auth: {
          common: { goLogin: 'Go to login' },
          register: { title: 'Register', submit: 'Create account', success: 'Registration successful, check your email.' },
          login: { title: 'Login', submit: 'Sign in', google: 'Sign in with Google', forgot: 'Forgot your password?' },
          verify: { title: 'Verify email', submit: 'Verify', success: 'Email verified successfully' },
          forgot: { title: 'Forgot password', submit: 'Send email', success: 'If account exists, email has been sent.' },
          reset: { title: 'Reset password', submit: 'Save new password', success: 'Password updated' },
          change: { title: 'Change password', current: 'Current password', new: 'New password', submit: 'Update', success: 'Password changed' }
        },
        payments: {
          title: 'Monetization',
          subtitle: 'Start one-time payments and subscriptions with Mercado Pago, and check real status.',
          buyOneTime: 'Buy one-time',
          refreshStatus: 'Refresh status',
          statusUpdated: 'Status synchronized from backend/provider.',
          lastOrder: 'Last order',
          currentStatus: 'Current status',
          unknown: 'unknown',
          subscribeMonthly: 'Subscribe monthly',
          subscribeYearly: 'Subscribe yearly',
          pending: 'Operation started. Complete checkout and wait for webhook confirmation.',
          refreshSubscriptionStatus: 'Refresh subscription status',
          lastSubscription: 'Last subscription',
          currentSubscriptionStatus: 'Subscription status',
          error: 'Payment operation could not be started.'
        },
        profile: {
          title: 'Profile',
          greeting: 'Hello {{email}}',
          role: 'Role: {{role}}',
          changePassword: 'Change password',
          avatar: {
            title: 'Avatar', alt: 'User avatar', empty: 'No avatar uploaded yet.', delete: 'Delete avatar', uploadSuccess: 'Avatar updated successfully', deleteSuccess: 'Avatar deleted', loading: 'Processing avatar...', invalidType: 'Select a valid image (png, jpg or webp).', invalidSize: 'The file exceeds the max allowed size (2 MB).', unexpectedError: 'Avatar could not be processed.', googleManaged: 'Profile image is managed from your Google account.'
          },
          push: {
            title: 'Push notifications', permission: 'Current permission: {{status}}', status: 'Status: {{status}}', active: 'active', inactive: 'inactive', enable: 'Enable web push', disable: 'Disable on this browser', sendTest: 'Send test', enabled: 'Web push enabled successfully.', disabled: 'Web push disabled for this browser.', disableNeedsToken: 'There is no local token to unregister.', testTitle: 'Push test notification', testBody: 'This is a test push notification.', testResult: 'Sent: {{sent}} | failed: {{failed}}', error: 'Web push state could not be updated.'
          }
        },
        admin: {
          title: 'Admin panel',
          navigation: { dashboard: 'Dashboard', users: 'Users', payments: 'Payments', subscriptions: 'Subscriptions', notifications: 'Notifications', avatars: 'Avatars', monetization: 'Monetization' },
          common: { loading: 'Loading...', loadError: 'Failed to load section.', actionError: 'Action failed.', yes: 'Yes', no: 'No' },
          dashboard: { totalUsers: 'Total users', adminUsers: 'Admins', payments: 'Payments', subscriptions: 'Subscriptions', pushDevices: 'Push devices', usersWithAvatar: 'Users with avatar' },
          users: { email: 'Email', role: 'Role', provider: 'Provider', verified: 'Verified', actions: 'Actions', toggleRole: 'Toggle role', roleUpdated: 'Role updated' },
          payments: { user: 'User', type: 'Type', status: 'Status', amount: 'Amount' },
          subscriptions: { user: 'User', period: 'Period', status: 'Status', externalReference: 'External reference' },
          notifications: { targetUserPlaceholder: 'Target user ID', titlePlaceholder: 'Title', bodyPlaceholder: 'Message', submit: 'Send notification', success: 'Notification sent', error: 'Notification could not be sent' },
          avatars: { user: 'User', avatar: 'Avatar', actions: 'Actions', imageAlt: 'User avatar', noAvatar: 'No avatar', delete: 'Delete avatar', deleted: 'Avatar deleted' },
          monetization: { mode: 'Mode', periodMode: 'Allowed period', save: 'Save configuration', updated: 'Configuration updated' }
        }
      }
    }
  },
  interpolation: { escapeValue: false }
});
