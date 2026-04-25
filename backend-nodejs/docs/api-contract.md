# NorthBridge API Contract

This document defines the backend contract the Flutter frontend expects.

## Core data shapes

### User

- `id`: string
- `name`: string
- `rating`: number
- `location`: string

### Task

- `id`: string
- `postedByUserId`: string
- `postedByName`: string
- `title`: string
- `description`: string
- `location`: string
- `price`: number
- `distanceKm`: number
- `scheduledAt`: ISO-8601 string

### Chat

- `chatId`: string
- `taskId`: string
- `taskTitle`: string
- `taskOwnerUserId`: string
- `taskOwnerName`: string
- `users`: string[]
- `lastMessage`: Message

### Message

- `id`: string
- `chatId`: string
- `taskId`: string
- `senderId`: string
- `text`: string
- `timestamp`: ISO-8601 string

### Voice task draft

- `title`: string
- `description`: string
- `location`: string
- `price`: number
- `scheduledAt`: ISO-8601 string

## Expected routes

### Auth and users

- `GET /v1/users`
- `GET /v1/auth/me`
- `POST /v1/auth/login`
- `POST /v1/auth/signup`
- `POST /v1/auth/logout`

### Tasks

- `GET /v1/tasks`
- `GET /v1/tasks/:taskId`
- `POST /v1/tasks`
- `POST /v1/tasks/:taskId/accept`

### Chats

- `GET /v1/chats`
- `GET /v1/chats/:chatId/messages`
- `POST /v1/chats/:chatId/messages`

### Voice

- `POST /v1/voice/parse-task`

## Auth Contract

Authenticated HTTP routes expect Firebase ID tokens in the header:

- `Authorization: Bearer <firebase-id-token>`

Authenticated WebSocket clients use the same token as a query parameter:

- `ws://host:port?token=<firebase-id-token>`
- `wss://host?token=<firebase-id-token>`

The backend verifies tokens with Firebase Admin and exposes this auth context to routes:

- `userId`: decoded Firebase `uid`
- `email`: decoded token email when present
- `name`: decoded token display name when present
- `tokenProvided`: whether a bearer token was sent
- `authErrorCode` / `authErrorMessage`: structured verification failure details
- `isAuthenticated`: true only when `userId` is present

Client-provided user IDs in request bodies are not trusted when Firebase auth is present. If an authenticated token user conflicts with a body actor field, the controller returns `403`.

Local tests may mock auth context. WebSocket `x-user-id` query override exists only when `ALLOW_WS_AUTH_OVERRIDE=true`. HTTP `X-User-Id` override exists for local development only when `ALLOW_HTTP_AUTH_OVERRIDE=true`, or outside production when Firebase Admin cannot initialize. Production clients should always use Firebase ID tokens.

## Real-Time Events

WebSocket messages are JSON objects with `{ "type": string, "data": object }`.

Currently published event types:

- `CONNECTED`
- `TASK_CREATED`
- `TASK_ACCEPTED`
- `TASK_COMPLETION_REQUESTED`
- `TASK_COMPLETED`
- `TASK_COMPLETION_DECLINED`
- `TASK_CANCELLED`
- `NEW_MESSAGE`
- `PAYMENT_REQUESTED`
- `PAYMENT_UPDATED`
- `PAYMENT_ACCEPTED`
- `PAYMENT_DECLINED`
- `PAYMENT_PAID`
- `PAYMENT_CANCELLED`
- `REPORT_CREATED`
- `REPORT_UPDATED`

Push notifications are optional and gated by `ENABLE_FCM_NOTIFICATIONS=true`. When enabled, the backend looks for `fcmTokens`, `deviceTokens`, or `fcmToken` on user documents.

## Frontend compatibility notes

- The Flutter models parse `rating`, `price`, and `distanceKm` as numeric values and convert them to doubles.
- All date fields must remain ISO-8601 strings because the frontend uses `DateTime.parse`.
- Chat payloads must include a nested `lastMessage` object.
- The frontend should subscribe to WebSocket events to update task lists, chat threads, and payment request state in real time.
