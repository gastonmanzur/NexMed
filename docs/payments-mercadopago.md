# Etapa 5 - Pagos con Mercado Pago

## Eventos webhook procesados
- `payment`: se consulta `/v1/payments/{id}` contra Mercado Pago y recién luego se normaliza estado interno (`pending`, `approved`, `rejected`, `cancelled`, `refunded`, `in_process`).
- `subscription_preapproval`: se consulta `/preapproval/{id}` para sincronizar estado interno de suscripción (`pending`, `authorized`, `paused`, `cancelled`, `ended`).

## Idempotencia
Cada evento se registra en `WebhookEvent` con llave única (`provider`, `eventKey`) para evitar reprocesar notificaciones duplicadas.

## Trazabilidad
- `PaymentOrder`: intento/orden de compra.
- `PaymentTransaction`: transacción confirmada/sincronizada por webhook o reconciliación.
- `Subscription`: relación recurrente por usuario con referencia externa `providerPreapprovalId`.

## Seguridad y coherencia
- No se confirma pago al crear preferencia/preapproval.
- No se confía ciegamente en payload del webhook: se verifica estado contra la API del proveedor.
- Si el modo de monetización deshabilita una modalidad, la API rechaza con `409`.
- La validación actual de `x-signature` es **ligera** (comparación de secreto compartido, priorizando `v1=`). Sirve para sandbox/dev y control básico.
- En `production` se exige `MERCADOPAGO_WEBHOOK_SECRET`/`MP_WEBHOOK_SECRET` y formato con `v1=`; para hardening avanzado queda pendiente validación criptográfica completa del payload firmado.

## Consulta y sincronización manual de estado (one-time)
- Endpoint: `GET /api/payments/orders/:orderId?sync=true`
- Si la orden está `pending` o `in_process`, el backend consulta Mercado Pago por `external_reference` y actualiza:
  - `PaymentOrder.status`
  - `PaymentTransaction` (upsert por `providerPaymentId`)
- Esto permite reconciliar pagos en sandbox/local aunque el webhook llegue tarde o falle.

## Suscripciones: creación, deduplicación y estado
- Crear suscripción: `POST /api/payments/subscriptions`
  - Campos: `planCode`, `title`, `amount`, `currency`, `period` (`monthly` | `yearly`).
  - Respuesta incluye: `subscriptionId`, `externalReference`, `providerPreapprovalId`, `checkoutUrl`, `status`.
- Control de duplicados:
  - Si el usuario ya tiene una suscripción `pending`, `authorized` o `paused` para el mismo `planCode + period`, responde `409 SUBSCRIPTION_ALREADY_EXISTS`.
- Consulta estado del usuario autenticado:
  - Endpoint: `GET /api/payments/subscriptions/me?subscriptionId=...&sync=true`
  - `subscriptionId` es opcional. Si no se envía, devuelve la última suscripción del usuario (con filtros opcionales `planCode` y `period`).
  - Con `sync=true`, si hay `providerPreapprovalId` y estado no terminal, el backend consulta `/preapproval/{id}` y persiste estado real.

## Sincronización por webhook de suscripciones
- Evento: `subscription_preapproval`.
- El backend consulta Mercado Pago `/preapproval/{id}`.
- Persiste estado normalizado y `nextBillingDate`.
- Si no encuentra por `providerPreapprovalId`, intenta por `externalReference` para robustez ante carreras de persistencia.
