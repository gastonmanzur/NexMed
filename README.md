# NexMed Turnos SaaS MVP

## Requisitos
- Node.js 20+
- MongoDB local

## Backend (`/backend`)
1. Copiar variables: `cp .env.example .env`
2. Completar `JWT_SECRET` y `MONGO_URI`
3. Ejecutar: `npm run dev`

Opcional seed rápido:
- `npm run seed:clinic`

## Web (`/web`)
1. Copiar variables: `cp .env.example .env`
2. Ejecutar: `npm run dev`

## URLs
- API: `http://localhost:5000`
- Web: `http://localhost:5173`

## Flujos MVP
- Registro/login de clínica en `/register` y `/login`.
- Panel admin en `/admin`, con agenda, métricas, búsqueda y cancelación.
- Configuración de horarios en `/admin/settings`.
- Reserva pública por slug en `/c/:slug`.
