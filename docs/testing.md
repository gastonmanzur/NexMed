# Testing y validación local

## Estrategia

Se prioriza cobertura real sobre flujos críticos:
- **unit/service tests**: reglas de negocio (auth, pagos, avatar, push)
- **middleware/routes tests**: guards, autorización y validaciones
- **integration-lite**: endpoints con supertest cuando aporta valor para seguridad y contratos

## Ejecutar tests

```bash
npm test
```

API solamente:

```bash
npm run test -w @starter/api
```

## Flujos críticos cubiertos

- auth local: provider conflict, credenciales inválidas, refresh rotation, logout-all
- auth Google: conflicto provider local/google
- autorización: guard auth + guard admin en rutas admin/push
- avatar: validación de imagen y reemplazo/eliminación coherente
- push: protección endpoints y reglas de registro/dispositivo
- pagos: modo habilitado/deshabilitado, creación one-time/subscription, webhook idempotente, firma webhook
- hardening: rate limiting middleware

## Validación manual sugerida

1. Registro local y verify-email.
2. Login local + refresh + logout + logout all.
3. Login con Google y validación de conflictos de provider.
4. Subir avatar válido y luego uno inválido (tipo/tamaño).
5. Registrar token push y actualizar token.
6. Crear pago y suscripción según modo activo.
7. Ejecutar webhook repetido y confirmar idempotencia.
8. Acceder panel admin con usuario admin y no-admin.
