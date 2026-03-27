# Stage 4 - Push Notifications (web + mobile)

## Architecture summary
- Module path: `apps/api/src/modules/push`
- Provider abstraction: `PushProvider` interface.
- Providers:
  - `NoopPushProvider` (default for local/dev without external credentials)
  - `FcmPushProvider` (Firebase Cloud Messaging through Firebase Admin SDK)
- Service orchestration: `PushService` handles targeting, provider errors, and invalid-token cleanup.

## Data model (`PushDevice`)
- `userId`: owner user.
- `token`: global unique token.
- `channel`: `web_push` | `mobile_push`.
- `platform`: `web` | `android` | `ios`.
- `status`: `active` | `invalid` | `revoked`.
- optional metadata: `deviceName`, `appVersion`, `osVersion`, `userAgent`.
- `lastSeenAt`, `invalidatedAt`, and timestamps.

## API endpoints
All endpoints return the standard `{ success, data | error }` shape.

### User endpoints (auth required)
- `POST /api/push/devices`: register/upsert token.
- `PATCH /api/push/devices/token`: refresh token (`oldToken` -> `newToken`).
- `DELETE /api/push/devices`: unregister token for current user.
- `GET /api/push/devices`: list user devices/tokens.
- `POST /api/push/send-test`: sends a test notification to the authenticated user.

### Admin endpoint (auth + admin role)
- `POST /api/push/admin/send`: send push to a specific user (`targetUserId`, `title`, `body`, optional `data`).

## Web vs mobile responsibilities

### Web push (browser)
- Browser must request `Notification` permission.
- Browser obtains token via Firebase Web Messaging SDK + VAPID key.
- Browser sends token to backend (`/api/push/devices`) with `platform=web` and `channel=web_push`.
- Browser token lifecycle differs from mobile and may be affected by permission revocation and service worker constraints.

### Mobile wrapper/native (Android/iOS)
- Native/wrapper app obtains FCM token using native SDKs (Android/iOS).
- Native app calls the same backend contract while authenticated, but with:
  - `platform=android | ios`
  - `channel=mobile_push`
  - optional metadata (`deviceName`, `appVersion`, `osVersion`)
- Web app **must not** attempt to obtain native tokens.

## FCM configuration required
Backend (`apps/api/.env`):
- `PUSH_PROVIDER=fcm`
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY` (escaped newlines as `\n`)

Frontend web (`apps/web/.env`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_WEB_PUSH_VAPID_KEY`

## Token invalidation strategy
- Provider responses are evaluated per token.
- FCM invalid-token errors (`invalid-registration-token`, `registration-token-not-registered`) mark tokens as `invalid`.
- Invalid tokens are excluded from future sends (`active` tokens only are targeted).

## Extension-ready points
This design is prepared for:
- topics and segmentation (add targeting repository/service layer)
- notification preferences per user
- history/audit trail table
- queue/job-based mass delivery
- multiple providers via `PushProvider` adapters
