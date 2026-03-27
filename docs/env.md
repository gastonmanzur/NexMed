# Guía de variables de entorno

## API (`apps/api/.env`)

### Core
- `NODE_ENV=development|test|production`
- `PORT=4000`
- `MONGO_URI=mongodb://localhost:27017/starter`
- `CORS_ORIGIN=http://localhost:5173`
- `APP_BASE_URL=http://localhost:4000`
- `WEB_BASE_URL=http://localhost:5173`

### Auth
- `JWT_ACCESS_SECRET=<min 32 chars>`
- `JWT_REFRESH_SECRET=<min 32 chars>`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`
- `EMAIL_TOKEN_EXPIRES_IN_MINUTES=60`
- `RESET_TOKEN_EXPIRES_IN_MINUTES=30`
- `GOOGLE_CLIENT_ID=<google oauth client id>`

### Avatar
- `AVATAR_STORAGE_DIR=storage/avatars`
- `AVATAR_PUBLIC_BASE_PATH=/media/avatars`
- `AVATAR_MAX_SIZE_BYTES=2097152`

### Email
- `SMTP_HOST=<optional>`
- `SMTP_PORT=587`
- `SMTP_USER=<optional>`
- `SMTP_PASS=<optional>`
- `SMTP_FROM=no-reply@example.com`

> Si `SMTP_HOST` no está definido, se usa `jsonTransport` para desarrollo local.

### Push (FCM)
- `PUSH_PROVIDER=noop|fcm`
- `FCM_PROJECT_ID=<required if PUSH_PROVIDER=fcm>`
- `FCM_CLIENT_EMAIL=<required if PUSH_PROVIDER=fcm>`
- `FCM_PRIVATE_KEY=<required if PUSH_PROVIDER=fcm>`

### Payments (Mercado Pago)
- `MONETIZATION_MODE=one_time_only|subscriptions_only|both`
- `SUBSCRIPTION_PERIOD_MODE=monthly|yearly|both`
- `MERCADOPAGO_ACCESS_TOKEN=<private token>`
- `MP_ACCESS_TOKEN=<alias opcional de MERCADOPAGO_ACCESS_TOKEN>`
- `MP_PUBLIC_KEY=<clave pública para frontend, opcional en esta etapa>`
- `MERCADOPAGO_WEBHOOK_SECRET=<required in production>`
- `MP_WEBHOOK_SECRET=<alias opcional de MERCADOPAGO_WEBHOOK_SECRET>`
- `MERCADOPAGO_API_BASE_URL=https://api.mercadopago.com`
- `MERCADOPAGO_CHECKOUT_SUCCESS_URL=<optional>`
- `MERCADOPAGO_CHECKOUT_FAILURE_URL=<optional>`
- `MERCADOPAGO_CHECKOUT_PENDING_URL=<optional>`
- `MERCADOPAGO_STATEMENT_DESCRIPTOR=<max 16 chars>`

### Rate limiting
- `AUTH_RATE_LIMIT_WINDOW_MS=60000`
- `AUTH_RATE_LIMIT_MAX=20`
- `WEBHOOK_RATE_LIMIT_WINDOW_MS=60000`
- `WEBHOOK_RATE_LIMIT_MAX=60`
- `PUSH_RATE_LIMIT_WINDOW_MS=60000`
- `PUSH_RATE_LIMIT_MAX=40`

## Web (`apps/web/.env`)
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_FIREBASE_API_KEY=<optional if no push>`
- `VITE_FIREBASE_AUTH_DOMAIN=<optional if no push>`
- `VITE_FIREBASE_PROJECT_ID=<optional if no push>`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=<optional if no push>`
- `VITE_FIREBASE_APP_ID=<optional if no push>`
- `VITE_FIREBASE_WEB_PUSH_VAPID_KEY=<optional if no push>`
