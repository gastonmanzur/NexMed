# NexMed — Runbook mínimo de staging/producción (Etapa 9)

## 0) Alcance
Runbook operativo básico para deploy reproducible, validación post-deploy y troubleshooting inicial.

## 1) Pre-deploy checklist

- [ ] Variables de entorno completas en API y Web.
- [ ] `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (>=32 chars).
- [ ] `APP_BASE_URL`, `WEB_BASE_URL` y `CORS_ORIGIN` coherentes por entorno.
- [ ] `AUTH_COOKIE_SAME_SITE`/`AUTH_COOKIE_SECURE` definidos según topología de dominios.
- [ ] `npm run test -w @starter/api` en verde.
- [ ] `npm run build` en verde.
- [ ] Base de datos de staging accesible.

## 2) Variables críticas por entorno

### API
- `NODE_ENV=production`
- `MONGO_URI`
- `CORS_ORIGIN` (lista separada por comas si aplica)
- `APP_BASE_URL`
- `WEB_BASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AUTH_COOKIE_SAME_SITE` (`strict`|`lax`|`none`)
- `AUTH_COOKIE_SECURE` (`true` recomendado en staging/prod)

### Web
- `VITE_API_URL=https://<api-domain>/api`

## 3) Orden de despliegue recomendado

1. Publicar API con env final.
2. Verificar `/api/health`.
3. Publicar Web con `VITE_API_URL` apuntando a API.
4. Ejecutar smoke post-deploy.

## 4) Smoke test post-deploy

- [ ] `GET /api/health` responde 200.
- [ ] Login web OK.
- [ ] Refresh de sesión al recargar OK.
- [ ] Crear/editar organización OK.
- [ ] Alta profesional/especialidad OK.
- [ ] Disponibilidad + creación de turno OK.
- [ ] Join paciente por link OK.
- [ ] Reserva self-service OK.
- [ ] Cancelación/reprogramación OK.
- [ ] Waitlist base + notificación in-app OK.

## 5) Troubleshooting rápido

### Login funciona pero refresh no
- Revisar `AUTH_COOKIE_SAME_SITE` y `AUTH_COOKIE_SECURE`.
- Revisar si frontend y API están en sitios distintos y ajustar estrategia de cookie.
- Verificar `CORS_ORIGIN` y `VITE_API_URL`.

### CORS bloquea requests
- Verificar que origin real esté incluido en `CORS_ORIGIN`.
- Confirmar esquema/protocolo correcto (`https://`).

### Build falla
- Ejecutar `npm install` para resolver árbol de dependencias.
- Reintentar `npm run build`.

## 6) Clasificación operativa de issues en salida

- **Bloqueante**: rompe login/refresh, reserva, cancelación/reagenda, join paciente o build/deploy.
- **No bloqueante**: detalle visual o copy sin afectar flujo crítico.
- **Pendiente**: mejora razonable que no compromete demo/beta controlada.
