# Auth Contract

- HTTP auth: authenticated HTTP endpoints expect `Authorization: Bearer <firebase-id-token>`.
- WebSocket auth: clients connect with `?token=<firebase-id-token>`.
- Backend verification: Firebase Admin verifies tokens and uses decoded `uid` as the canonical actor.
- Route auth context: `{ userId, email, name, tokenProvided, authErrorCode, authErrorMessage, isAuthenticated }`.
- Actor rule: when `auth.userId` exists, body actor fields must either be omitted or match it; mismatches return `403`.
- Error rule: missing auth returns `401`; invalid/expired/revoked tokens return `401` with a stable message.
- Local tests: tests may mock `getAuthContext`; WebSocket `?x-user-id=<id>` is only allowed when `ALLOW_WS_AUTH_OVERRIDE=true`.

Do not send Firebase ID tokens in request bodies. Use the HTTP header or WebSocket query token only.
