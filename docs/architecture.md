# Arquitectura del starter

## Principios

- Monorepo por workspaces npm.
- TypeScript estricto en apps y packages.
- Separación por capas en backend (routes/controllers/services/repositories/models).
- Frontend orientado a features y route guards.
- Contratos compartidos para reducir drift frontend/backend.

## Backend (`apps/api`)

### Capas

- `config`: parsing y validación de entorno + logger.
- `core`: errores, middlewares transversales, rate limiting, respuesta API.
- `modules/*`: dominio por feature:
  - `auth`: local auth, Google login, refresh sessions, verify/reset password, roles.
  - `avatar`: upload/replace/delete de imagen con validación y normalización.
  - `push`: registro de dispositivos, envío admin, provider adapter noop/FCM.
  - `payments`: checkout one-time/subscription y webhook idempotente.
  - `admin`: endpoints agregados para dashboard/pagos/notificaciones.
  - `health`: healthcheck.

### Seguridad base

- Helmet + CORS con origen explícito.
- Cookies refresh token `httpOnly` y `sameSite=strict`.
- Guards por JWT y roles.
- Rate limiting en rutas sensibles (auth, push, webhook).
- Validación Zod para payloads críticos.

## Frontend (`apps/web`)

### Organización

- `app`: shell y routing.
- `features/auth`: contexto de sesión, guards y páginas auth.
- `features/admin`: panel admin y consumo de módulos críticos.
- `features/notifications`: permisos web push, registro de token, envío admin.
- `features/payments`: checkout y estado de monetización.

### Flujo auth UI

- `AuthProvider` intenta refresh al iniciar.
- `ProtectedRoute` exige sesión y opcionalmente roles.
- Al expirar sesión, el frontend redirige a login.

## Contratos y utilidades

- `packages/shared-types`: DTOs y tipos de dominio usados por API/Web.
- `packages/shared-utils`: helpers puros reutilizables.
- `packages/ui`: componentes UI compartibles.

## Observabilidad

- `pino` + `pino-http` para logs estructurados.
- trazas relevantes para webhooks duplicados/firmas inválidas.
- errores normalizados por `errorMiddleware`.
