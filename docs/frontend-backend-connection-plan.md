# Frontend-Backend Connection Plan (No-Connect Execution Plan)

## Goal
Define a safe, staged plan to connect Flutter frontend and Node backend with clear validation gates, while avoiding any production cutover until approved.

## Current Baseline
- Frontend services are API-first and mock/test data files are removed.
- Backend runtime is active and exposes v1 routes.
- A cached in-memory fallback remains in some frontend services for temporary resilience when API calls fail.

## Phase 1: Environment Standardization
1. Confirm backend base URL strategy:
- Android emulator: `http://10.0.2.2:3000/api`
- iOS simulator: `http://127.0.0.1:3000/api`
- Physical device: `http://<your-lan-ip>:3000/api`
2. Define a single source of truth for frontend API URL via `--dart-define`.
3. Ensure backend CORS whitelist includes all expected frontend origins.
4. Verify Firebase project alignment between frontend and backend environments (dev/stage/prod).

## Phase 2: Auth Contract Alignment
1. Lock token contract:
- Frontend sends `Authorization: Bearer <firebase-id-token>`.
- Backend verifies Firebase ID token and resolves user identity.
2. Confirm login/session endpoints payload schema with examples.
3. Add explicit error code mapping table for auth failures (`401`, `403`, token expired).
4. Validate sign-out behavior (frontend cache clear only, no server-side token revoke dependency).

## Phase 3: Task Domain Integration
1. Validate request/response schemas for:
- `GET /v1/tasks`
- `POST /v1/tasks`
- `POST /v1/tasks/:id/accept`
- Completion/rating endpoints.
2. Confirm sort/filter contract (`sortBy`, `acceptorLat`, `acceptorLng`).
3. Validate task status transition rules and rejection reasons.
4. Add one golden-path end-to-end test for create -> accept -> completion request -> completion confirm -> rating.

## Phase 4: Chat Domain Integration
1. Validate contract for:
- `GET /v1/chats`
- `GET /v1/chats/:chatId/messages`
- `POST /v1/chats/:chatId/messages`
- `POST /v1/chats/task`
2. Confirm message ordering, timestamp format, and nullability rules.
3. Ensure backend enforces chat membership checks.
4. Add integration test covering task chat creation and first message flow.

## Phase 5: Voice Parsing Integration
1. Validate contract for `POST /v1/voice/parse-task`.
2. Confirm parser output field rules (title, budget, schedule, mode, location).
3. Define fallback UX for low-confidence parsing responses.
4. Add sample phrase set for regression checks (English/Hindi variants).

## Phase 6: Reliability and Observability
1. Standardize API error envelope and correlation/request ID.
2. Add backend structured logs for auth/task/chat/voice routes.
3. Add frontend API failure telemetry hooks.
4. Define retry policy boundaries (read-only endpoints only).

## Phase 7: Cutover Checklist (Deferred)
1. Disable any remaining temporary in-memory fallback once backend reliability is confirmed.
2. Run full integration suite on clean database state.
3. Perform device matrix smoke tests (Android emulator, iOS simulator, physical Android).
4. Approve production connection only after all gates pass.

## Validation Gates
- Gate A: Auth flows pass with real Firebase token verification.
- Gate B: Task lifecycle works end-to-end without local fallback.
- Gate C: Chat send/fetch is stable under reconnect and refresh.
- Gate D: Voice parse output is accepted by task creation flow.
- Gate E: No critical analyzer/test failures in frontend/backend CI.

## Out of Scope for This Plan
- Production deployment automation.
- Database schema redesign.
- Realtime socket migration (if introduced later).
