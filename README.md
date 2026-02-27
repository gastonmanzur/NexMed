# NexMed Turnos SaaS MVP

## Requisitos
- Node.js 20+
- MongoDB local

## Backend (`/backend`)
1. Copiar variables: `cp .env.example .env`
2. Completar `JWT_SECRET`, `MONGO_URI` y `GOOGLE_CLIENT_ID`
3. Ejecutar: `npm run dev`

Opcional seed rápido:
- `npm run seed:clinic`

## Web (`/web`)
1. Copiar variables: `cp .env.example .env.local`
2. Completar `VITE_GOOGLE_CLIENT_ID` en `web/.env.local`
3. Reiniciar el servidor cada vez que cambies variables (`npm run dev`)
4. Ejecutar: `npm run dev`

## URLs
- API: `http://localhost:5000`
- Web: `http://localhost:5173`

## Flujos MVP
- Registro/login de clínica en `/register` y `/login`.
- Portal paciente en `/patient`, incluyendo login con Google y cierre de sesión.
- Panel admin en `/admin`, con agenda, métricas, búsqueda y cancelación.
- Configuración de horarios en `/admin/settings`.
- Reserva pública por slug en `/c/:slug`.

## Testing de email en local
- **MailHog (recomendado)**
  1. Levantar MailHog:
     `docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog`
  2. Configurar backend:
     - `EMAIL_PROVIDER=smtp`
     - `SMTP_HOST=localhost`
     - `SMTP_PORT=1025`
  3. Ver correos en `http://localhost:8025`.

- **Ethereal (alternativa)**
  1. Configurar backend:
     - `EMAIL_PROVIDER=ethereal`
     - `ETHEREAL_USER=...`
     - `ETHEREAL_PASS=...`
  2. El worker registrará en consola el identificador del envío.

## Debug rápido de notificaciones
- Probar contador de no leídas:
  `curl -H "Authorization: Bearer <token>" http://localhost:5000/api/notifications/unread-count`
- Probar listado paginado:
  `curl -H "Authorization: Bearer <token>" "http://localhost:5000/api/notifications?page=1&limit=50"`
