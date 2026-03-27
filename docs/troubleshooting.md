# Troubleshooting

## Error de CORS en frontend
- Verificar `CORS_ORIGIN` en API y `VITE_API_URL` en web.
- Confirmar que frontend corre en el origen configurado.

## Login funciona pero refresh falla
- Revisar cookies bloqueadas en navegador.
- En producción, usar HTTPS para cookie `secure`.
- Confirmar `JWT_REFRESH_SECRET` y reloj del servidor.

## Push con FCM no envía
- Revisar `PUSH_PROVIDER=fcm` y credenciales FCM completas.
- Validar formato de `FCM_PRIVATE_KEY` (saltos de línea escapados).
- Confirmar permisos de notificación en navegador.

## Webhook Mercado Pago rechazado
- Verificar `MERCADOPAGO_WEBHOOK_SECRET`.
- Confirmar que el header `x-signature` llegue correctamente.
- Revisar logs de API para `INVALID_WEBHOOK_SIGNATURE`.

## Upload de avatar falla
- Revisar tipo permitido (`jpeg/png/webp`) y tamaño máximo.
- Confirmar permisos de escritura sobre `AVATAR_STORAGE_DIR`.

## Tests fallan por dependencias nativas
- Ejecutar `npm install` en raíz del monorepo para instalar `sharp`, `supertest`, etc.
