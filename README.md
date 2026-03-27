# Professional Web Starter (React + Express + MongoDB)

Starter monorepo profesional para productos web con autenticación, roles, avatar, push notifications, monetización y panel admin.

## Estado actual

La base está consolidada hasta la etapa de hardening/testing:
- arquitectura modular frontend + backend
- auth local + Google + sesión con refresh token
- permisos por roles y rutas protegidas
- subida y reemplazo de avatar
- push notifications (noop / FCM)
- pagos y suscripciones con Mercado Pago + webhook idempotente
- panel admin con módulos críticos
- tests de servicios, middleware y rutas sensibles

## Monorepo

- `apps/api`: API Express + TypeScript + MongoDB
- `apps/web`: Frontend React + Vite
- `packages/shared-types`: contratos compartidos
- `packages/shared-utils`: utilidades compartidas
- `packages/ui`: componentes UI base
- `docs`: arquitectura, configuración y troubleshooting

## Instalación local

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

3. Completar credenciales reales (Google, SMTP, Firebase, Mercado Pago) según `docs/env.md`.

4. Levantar backend + frontend:

```bash
npm run dev
```

Servicios por defecto:
- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Testing

Ejecución de todos los tests del monorepo:

```bash
npm test
```

Ejecución por app:

```bash
npm run test -w @starter/api
npm run test -w @starter/web
```

Checks recomendados antes de merge:

```bash
npm run typecheck
npm run build
```

## Integraciones externas

- Google Auth: `GOOGLE_CLIENT_ID` en API.
- Email (verify/reset): SMTP opcional; fallback `jsonTransport` en local.
- Firebase/FCM: habilitar `PUSH_PROVIDER=fcm` + credenciales de service account.
- Mercado Pago: token privado + webhook secret para validar eventos.

## Seguridad y hardening aplicados

- validación estricta con Zod en endpoints críticos
- rate limiting en auth, push y webhooks de pagos
- cookies refresh con `httpOnly`, `sameSite=strict`, `secure` en producción
- protección de rutas sensibles con `requireAuth` y `requireRoles`
- validación de tipo/tamaño de imágenes + normalización segura
- manejo consistente de errores sin filtrar internals
- verificación de entorno reforzada para FCM y webhook secret en producción

## Documentación de desarrollo

- Arquitectura: `docs/architecture.md`
- Variables de entorno: `docs/env.md`
- Testing y validación manual: `docs/testing.md`
- Troubleshooting: `docs/troubleshooting.md`
- Integración de push: `docs/push-notifications.md`
- Integración de pagos: `docs/payments-mercadopago.md`
